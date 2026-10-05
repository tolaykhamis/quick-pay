package com.progressoft.quickpay.payments.security;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, TokenService.class})
class AuthControllerTest {

    private static final String PROTECTED_URL = "/api/payments";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TokenService tokenService;

    @Test
    void givenValidCredentials_whenLogin_thenReturnAccessToken() throws Exception {
        mockMvc.perform(loginRequest("tolay", "12345"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty());
    }

    @Test
    void givenWrongPassword_whenLogin_thenReturn401() throws Exception {
        mockMvc.perform(loginRequest("tolay", "wrong"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void givenNoToken_whenCallProtectedEndpoint_thenReturn401() throws Exception {
        mockMvc.perform(get(PROTECTED_URL))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void givenTokenFromLogin_whenCallProtectedEndpoint_thenPassesSecurity() throws Exception {
        String body = mockMvc.perform(loginRequest("tolay", "12345"))
                .andReturn().getResponse().getContentAsString();
        String accessToken = JsonPath.read(body, "$.accessToken");

        mockMvc.perform(get(PROTECTED_URL).header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void givenExpiredToken_whenCallProtectedEndpoint_thenReturn401() throws Exception {
        Instant twentyMinutesAgo = Instant.now().minus(20, ChronoUnit.MINUTES);
        String expiredToken = tokenService.createAccessToken("tolay", List.of("ROLE_PAYMENT"), twentyMinutesAgo);

        mockMvc.perform(get(PROTECTED_URL).header(HttpHeaders.AUTHORIZATION, "Bearer " + expiredToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void givenTokenWithoutRequiredRole_whenCallProtectedEndpoint_thenReturn403() throws Exception {
        String token = tokenService.createAccessToken("tolay", List.of("ROLE_OTHER"));

        mockMvc.perform(get(PROTECTED_URL).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void givenTokenSignedWithAnotherKey_whenCallProtectedEndpoint_thenReturn401() throws Exception {
        String forgedToken = new TokenService().createAccessToken("tolay", List.of("ROLE_PAYMENT"));

        mockMvc.perform(get(PROTECTED_URL).header(HttpHeaders.AUTHORIZATION, "Bearer " + forgedToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void givenBasicAuthHeader_whenCallProtectedEndpoint_thenReturn401() throws Exception {
        mockMvc.perform(get(PROTECTED_URL).header(HttpHeaders.AUTHORIZATION, "Basic dG9sYXk6MTIzNDU="))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void givenValidRefreshToken_whenRefresh_thenReturnNewTokens() throws Exception {
        String refreshToken = tokenService.createRefreshToken("tolay", tokenService.currentVersion("tolay"));

        String body = mockMvc.perform(refreshRequest(refreshToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andReturn().getResponse().getContentAsString();
        String newAccessToken = JsonPath.read(body, "$.accessToken");

        mockMvc.perform(get(PROTECTED_URL).header(HttpHeaders.AUTHORIZATION, "Bearer " + newAccessToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void givenAccessToken_whenRefresh_thenReturn401() throws Exception {
        String accessToken = tokenService.createAccessToken("tolay", List.of("ROLE_PAYMENT"));

        mockMvc.perform(refreshRequest(accessToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void givenExpiredRefreshToken_whenRefresh_thenReturn401() throws Exception {
        Instant eightDaysAgo = Instant.now().minus(8, ChronoUnit.DAYS);
        String expiredToken = tokenService.createRefreshToken("tolay", tokenService.currentVersion("tolay"), eightDaysAgo);

        mockMvc.perform(refreshRequest(expiredToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void givenRefreshTokenSignedWithAnotherKey_whenRefresh_thenReturn401() throws Exception {
        String forgedToken = new TokenService().createRefreshToken("tolay", tokenService.currentVersion("tolay"));

        mockMvc.perform(refreshRequest(forgedToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void givenGarbageToken_whenRefresh_thenReturn401() throws Exception {
        mockMvc.perform(refreshRequest("not-a-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void givenMissingToken_whenRefresh_thenReturn401() throws Exception {
        mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void givenRefreshTokenOfUnknownUser_whenRefresh_thenReturn401() throws Exception {
        String refreshToken = tokenService.createRefreshToken("ghost", tokenService.currentVersion("ghost"));

        mockMvc.perform(refreshRequest(refreshToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void givenRefreshTokenAsBearer_whenCallProtectedEndpoint_thenReturn401() throws Exception {
        String refreshToken = tokenService.createRefreshToken("tolay", tokenService.currentVersion("tolay"));

        mockMvc.perform(get(PROTECTED_URL).header(HttpHeaders.AUTHORIZATION, "Bearer " + refreshToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void givenExpiredAccessTokenHeader_whenRefresh_thenReturn401EvenWithValidRefreshToken() throws Exception {
        Instant twentyMinutesAgo = Instant.now().minus(20, ChronoUnit.MINUTES);
        String expiredAccessToken = tokenService.createAccessToken("tolay", List.of("ROLE_PAYMENT"), twentyMinutesAgo);

        mockMvc.perform(refreshRequest(tokenService.createRefreshToken("tolay", tokenService.currentVersion("tolay")))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + expiredAccessToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void givenLogout_whenRefreshWithOldRefreshToken_thenReturn401() throws Exception {
        String refreshToken = tokenService.createRefreshToken("tolay", tokenService.currentVersion("tolay"));
        String accessToken = tokenService.createAccessToken("tolay", List.of("ROLE_PAYMENT"));

        mockMvc.perform(logoutRequest("/api/auth/logout", accessToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(refreshRequest(refreshToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void givenNoToken_whenLogout_thenReturn401() throws Exception {
        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void givenLogout_whenUseSameAccessToken_thenStillAccepted() throws Exception {
        String accessToken = tokenService.createAccessToken("tolay", List.of("ROLE_PAYMENT"));

        mockMvc.perform(logoutRequest("/api/auth/logout", accessToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(get(PROTECTED_URL).header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void givenLogout_whenLoginAgain_thenNewRefreshTokenWorks() throws Exception {
        String accessToken = tokenService.createAccessToken("tolay", List.of("ROLE_PAYMENT"));
        mockMvc.perform(logoutRequest("/api/auth/logout", accessToken))
                .andExpect(status().isNoContent());

        String body = mockMvc.perform(loginRequest("tolay", "12345"))
                .andReturn().getResponse().getContentAsString();
        String newRefreshToken = JsonPath.read(body, "$.refreshToken");

        mockMvc.perform(refreshRequest(newRefreshToken))
                .andExpect(status().isOk());
    }

    @Test
    void givenAdmin_whenLogoutAnotherUser_thenThatUsersRefreshTokenStopsWorking() throws Exception {
        String tolayRefreshToken = tokenService.createRefreshToken("tolay", tokenService.currentVersion("tolay"));
        String adminRefreshToken = tokenService.createRefreshToken("admin", tokenService.currentVersion("admin"));
        String adminAccessToken = tokenService.createAccessToken("admin", List.of("ROLE_ADMIN"));

        mockMvc.perform(logoutRequest("/api/auth/logout/tolay", adminAccessToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(refreshRequest(tolayRefreshToken))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(refreshRequest(adminRefreshToken))
                .andExpect(status().isOk());
    }

    @Test
    void givenNonAdmin_whenLogoutAnotherUser_thenReturn403AndTargetIsNotLoggedOut() throws Exception {
        String adminRefreshToken = tokenService.createRefreshToken("admin", tokenService.currentVersion("admin"));
        String tolayAccessToken = tokenService.createAccessToken("tolay", List.of("ROLE_PAYMENT"));

        mockMvc.perform(logoutRequest("/api/auth/logout/admin", tolayAccessToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(refreshRequest(adminRefreshToken))
                .andExpect(status().isOk());
    }

    @Test
    void givenAdmin_whenLogoutUnknownUser_thenReturn404() throws Exception {
        String adminAccessToken = tokenService.createAccessToken("admin", List.of("ROLE_ADMIN"));

        mockMvc.perform(logoutRequest("/api/auth/logout/ghost", adminAccessToken))
                .andExpect(status().isNotFound());
    }

    private static MockHttpServletRequestBuilder logoutRequest(String path, String accessToken) {
        return post(path).header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken);
    }

    private static MockHttpServletRequestBuilder refreshRequest(String refreshToken) {
        return post("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"refreshToken\":\"" + refreshToken + "\"}");
    }

    private static MockHttpServletRequestBuilder loginRequest(String username, String password) {
        return post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}");
    }
}
