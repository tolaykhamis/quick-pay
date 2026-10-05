package com.progressoft.quickpay.payments.security;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TokenService {

    private static final Duration ACCESS_TOKEN_LIFETIME = Duration.ofMinutes(15);
    private static final Duration REFRESH_TOKEN_LIFETIME = Duration.ofDays(7);

    private final JwtEncoder encoder;
    private final JwtDecoder accessTokenDecoder;
    private final JwtDecoder refreshTokenDecoder;
    private final Map<String, Long> versions = new ConcurrentHashMap<>();

    public TokenService() {
        byte[] keyBytes = new byte[32];
        new SecureRandom().nextBytes(keyBytes);
        SecretKey key = new SecretKeySpec(keyBytes, "HmacSHA256");

        encoder = new NimbusJwtEncoder(new ImmutableSecret<>(key));
        accessTokenDecoder = decoderFor(key, "access");
        refreshTokenDecoder = decoderFor(key, "refresh");
    }

    public String createAccessToken(String username, Collection<String> roles) {
        return createAccessToken(username, roles, Instant.now());
    }

    String createAccessToken(String username, Collection<String> roles, Instant issuedAt) {
        return encode(JwtClaimsSet.builder()
                .subject(username)
                .claim("roles", roles)
                .claim("type", "access")
                .issuedAt(issuedAt)
                .expiresAt(issuedAt.plus(ACCESS_TOKEN_LIFETIME))
                .build());
    }

    public String createRefreshToken(String username, long version) {
        return createRefreshToken(username, version, Instant.now());
    }

    String createRefreshToken(String username, long version, Instant issuedAt) {
        return encode(JwtClaimsSet.builder()
                .subject(username)
                .claim("ver", version)
                .claim("type", "refresh")
                .issuedAt(issuedAt)
                .expiresAt(issuedAt.plus(REFRESH_TOKEN_LIFETIME))
                .build());
    }

    public JwtDecoder accessTokenDecoder() {
        return accessTokenDecoder;
    }

    public Jwt parseRefreshToken(String token) {
        Jwt refreshToken = refreshTokenDecoder.decode(token);
        Number tokenVersion = refreshToken.getClaim("ver");
        if (tokenVersion.longValue() != currentVersion(refreshToken.getSubject())) {
            throw new BadJwtException("Refresh token was revoked");
        }
        return refreshToken;
    }

    public long currentVersion(String username) {
        return versions.getOrDefault(username, 0L);
    }

    public void revokeRefreshTokens(String username) {
        versions.merge(username, 1L, Long::sum);
    }

    private String encode(JwtClaimsSet claims) {
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    private static JwtDecoder decoderFor(SecretKey key, String type) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(key).build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefault(),
                new JwtClaimValidator<String>("type", type::equals)));
        return decoder;
    }
}
