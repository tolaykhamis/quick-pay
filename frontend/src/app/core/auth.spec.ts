import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Auth } from './auth';
import { authInterceptor } from './auth-interceptor';

describe('Auth', () => {
  let auth: Auth;
  let http: HttpClient;
  let backend: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    auth = TestBed.inject(Auth);
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    backend.verify();
    localStorage.clear();
  });

  function loginSuccessfully(): void {
    auth.login('tolay', '12345').subscribe();
    backend.expectOne('/api/auth/login').flush({ accessToken: 'abc', refreshToken: 'r1' });
  }

  function unauthorized() {
    return { status: 401, statusText: 'Unauthorized' };
  }

  it('starts logged out', () => {
    expect(auth.isLoggedIn()).toBe(false);
    expect(auth.getAccessToken()).toBeNull();
  });

  it('keeps the access token in memory and the refresh token in localStorage after login', () => {
    auth.login('tolay', '12345').subscribe();
    const request = backend.expectOne('/api/auth/login');
    expect(request.request.body).toEqual({ username: 'tolay', password: '12345' });
    request.flush({ accessToken: 'abc', refreshToken: 'r1' });

    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.getAccessToken()).toBe('abc');
    expect(localStorage.getItem('refreshToken')).toBe('r1');
  });

  it('adds the Bearer header to protected API calls', () => {
    loginSuccessfully();

    http.get('/api/payments').subscribe();

    const request = backend.expectOne('/api/payments');
    expect(request.request.headers.get('Authorization')).toBe('Bearer abc');
    request.flush({});
  });

  it('does not add the header to URLs outside /api or to the public login and refresh calls', () => {
    loginSuccessfully();

    http.get('/other').subscribe();
    http.post('/api/auth/refresh', {}).subscribe();

    const outside = backend.expectOne('/other');
    const publicCall = backend.expectOne('/api/auth/refresh');
    expect(outside.request.headers.has('Authorization')).toBe(false);
    expect(publicCall.request.headers.has('Authorization')).toBe(false);
    outside.flush({});
    publicCall.flush({});
  });

  it('refreshes on a 401 and repeats the call with the new access token', () => {
    loginSuccessfully();
    let result: unknown;

    http.get('/api/payments').subscribe(response => (result = response));
    backend.expectOne('/api/payments').flush(null, unauthorized());

    const refreshRequest = backend.expectOne('/api/auth/refresh');
    expect(refreshRequest.request.body).toEqual({ refreshToken: 'r1' });
    refreshRequest.flush({ accessToken: 'abc2', refreshToken: 'r2' });

    const repeated = backend.expectOne('/api/payments');
    expect(repeated.request.headers.get('Authorization')).toBe('Bearer abc2');
    repeated.flush({ content: [] });

    expect(result).toEqual({ content: [] });
    expect(localStorage.getItem('refreshToken')).toBe('r2');
  });

  it('logs out and goes to /login when the refresh fails', () => {
    loginSuccessfully();
    let failed = false;

    http.get('/api/payments').subscribe({ error: () => (failed = true) });
    backend.expectOne('/api/payments').flush(null, unauthorized());
    backend.expectOne('/api/auth/refresh').flush(null, unauthorized());

    expect(failed).toBe(true);
    expect(auth.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('sends only one refresh request when several calls get a 401 together', () => {
    loginSuccessfully();

    http.get('/api/payments').subscribe();
    http.get('/api/templates').subscribe();
    backend.expectOne('/api/payments').flush(null, unauthorized());
    backend.expectOne('/api/templates').flush(null, unauthorized());

    backend.expectOne('/api/auth/refresh').flush({ accessToken: 'abc2', refreshToken: 'r2' });

    backend.expectOne('/api/payments').flush({});
    backend.expectOne('/api/templates').flush({});
  });

  it('does not navigate when the login itself returns 401', () => {
    auth.login('tolay', 'wrong').subscribe({ error: () => undefined });
    backend.expectOne('/api/auth/login').flush(null, unauthorized());

    expect(auth.isLoggedIn()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('tells the server on logout, then clears the tokens and goes to /login', () => {
    loginSuccessfully();

    auth.logout();

    const request = backend.expectOne('/api/auth/logout');
    expect(request.request.headers.get('Authorization')).toBe('Bearer abc');
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(auth.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('still logs out locally when the server call fails', () => {
    loginSuccessfully();

    auth.logout();
    backend.expectOne('/api/auth/logout').flush(null, { status: 500, statusText: 'Server Error' });

    expect(auth.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('refreshes first and then logs out on the server when the access token has expired', () => {
    loginSuccessfully();

    auth.logout();
    backend.expectOne('/api/auth/logout').flush(null, unauthorized());
    backend.expectOne('/api/auth/refresh').flush({ accessToken: 'abc2', refreshToken: 'r2' });

    const repeated = backend.expectOne('/api/auth/logout');
    expect(repeated.request.headers.get('Authorization')).toBe('Bearer abc2');
    repeated.flush(null, { status: 204, statusText: 'No Content' });

    expect(auth.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('still ends the session when the refresh also fails during logout', () => {
    loginSuccessfully();

    auth.logout();
    backend.expectOne('/api/auth/logout').flush(null, unauthorized());
    backend.expectOne('/api/auth/refresh').flush(null, unauthorized());

    expect(auth.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('sends no request on logout when not logged in', () => {
    auth.logout();

    backend.expectNone('/api/auth/logout');
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('makes no request at start-up when there is no stored refresh token', () => {
    auth.restoreSession().subscribe();

    backend.expectNone('/api/auth/refresh');
    expect(auth.isLoggedIn()).toBe(false);
  });

  it('logs in at start-up with a valid stored refresh token', () => {
    localStorage.setItem('refreshToken', 'r1');

    auth.restoreSession().subscribe();
    backend.expectOne('/api/auth/refresh').flush({ accessToken: 'abc', refreshToken: 'r2' });

    expect(auth.isLoggedIn()).toBe(true);
    expect(localStorage.getItem('refreshToken')).toBe('r2');
  });

  it('deletes the stored refresh token at start-up when the server rejects it', () => {
    localStorage.setItem('refreshToken', 'old');

    auth.restoreSession().subscribe();
    backend.expectOne('/api/auth/refresh').flush(null, unauthorized());

    expect(auth.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  it('keeps the stored refresh token at start-up when the server is failing', () => {
    localStorage.setItem('refreshToken', 'r1');

    auth.restoreSession().subscribe();
    backend.expectOne('/api/auth/refresh').flush(null, { status: 500, statusText: 'Server Error' });

    expect(auth.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('refreshToken')).toBe('r1');
  });
});
