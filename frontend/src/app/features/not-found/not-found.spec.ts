import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { NotFound } from './not-found';

describe('NotFound', () => {
  it('shows the "Page not found" heading', async () => {
    const fixture = TestBed.createComponent(NotFound);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('h2').textContent).toBe('Page not found');
  });

  it('goes back one page when "Go back" is clicked', async () => {
    const location = TestBed.inject(Location);
    const back = vi.spyOn(location, 'back').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(NotFound);
    await fixture.whenStable();

    fixture.nativeElement.querySelector('button').click();

    expect(back).toHaveBeenCalledTimes(1);
  });
});
