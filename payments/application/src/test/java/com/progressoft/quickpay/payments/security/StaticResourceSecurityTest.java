package com.progressoft.quickpay.payments.security;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, TokenService.class})
class StaticResourceSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @ParameterizedTest
    @ValueSource(strings = {"/", "/index.html", "/favicon.ico", "/main.js", "/styles.css"})
    void givenAngularStaticFile_whenGetWithoutToken_thenNotBlockedBySecurity(String path) throws Exception {
        mockMvc.perform(get(path))
                .andExpect(status().isNotFound());
    }

    @ParameterizedTest
    @ValueSource(strings = {"/secret.txt", "/api/payments", "/api/templates"})
    void givenOtherPath_whenGetWithoutToken_thenReturn401(String path) throws Exception {
        mockMvc.perform(get(path))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void givenRootPath_whenPostWithoutToken_thenReturn401() throws Exception {
        mockMvc.perform(post("/"))
                .andExpect(status().isUnauthorized());
    }
}
