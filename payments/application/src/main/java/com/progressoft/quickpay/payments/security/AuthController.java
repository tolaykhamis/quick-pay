package com.progressoft.quickpay.payments.security;

import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collection;
import java.util.List;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    record LoginRequest(String username, String password) {
    }

    record RefreshRequest(String refreshToken) {
    }

    record TokenResponse(String accessToken, String refreshToken) {
    }

    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final TokenService tokenService;

    public AuthController(AuthenticationManager authenticationManager,
                          UserDetailsService userDetailsService,
                          TokenService tokenService) {
        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
        this.tokenService = tokenService;
    }

    @PostMapping("/login")
    public TokenResponse login(@RequestBody LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(request.username(), request.password()));
        return issueTokens(authentication.getName(), authentication.getAuthorities());
    }

    @PostMapping("/refresh")
    public TokenResponse refresh(@RequestBody RefreshRequest request) {
        Jwt refreshToken;
        try {
            refreshToken = tokenService.parseRefreshToken(request.refreshToken());
        } catch (JwtException exception) {
            throw new BadCredentialsException("Invalid refresh token", exception);
        }
        UserDetails user = userDetailsService.loadUserByUsername(refreshToken.getSubject());
        return issueTokens(user.getUsername(), user.getAuthorities());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(Authentication authentication) {
        tokenService.revokeRefreshTokens(authentication.getName());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/logout/{username}")
    public ResponseEntity<Void> logoutUser(@PathVariable String username) {
        try {
            userDetailsService.loadUserByUsername(username);
        } catch (UsernameNotFoundException exception) {
            return ResponseEntity.notFound().build();
        }
        tokenService.revokeRefreshTokens(username);
        return ResponseEntity.noContent().build();
    }

    private TokenResponse issueTokens(String username, Collection<? extends GrantedAuthority> authorities) {
        List<String> roles = authorities.stream()
                .map(GrantedAuthority::getAuthority)
                .toList();
        return new TokenResponse(
                tokenService.createAccessToken(username, roles),
                tokenService.createRefreshToken(username, tokenService.currentVersion(username)));
    }
}
