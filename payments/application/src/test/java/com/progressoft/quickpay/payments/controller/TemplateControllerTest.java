package com.progressoft.quickpay.payments.controller;

import com.progressoft.quickpay.payments.TemplateTestData;
import com.progressoft.quickpay.payments.domain.exception.InvalidSortFieldException;
import com.progressoft.quickpay.payments.mapper.TemplateMapper;
import com.progressoft.quickpay.payments.repository.models.TemplateFilter;
import com.progressoft.quickpay.payments.resources.paging.PagingOptions;
import com.progressoft.quickpay.payments.resources.paging.PagingResult;
import com.progressoft.quickpay.payments.resources.template.TemplateRequest;
import com.progressoft.quickpay.payments.security.SecurityConfig;
import com.progressoft.quickpay.payments.security.TokenService;
import com.progressoft.quickpay.payments.service.TemplateService;
import com.progressoft.training.fileparser.domain.Template;
import com.progressoft.training.fileparser.exception.DuplicateTemplateException;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;

import java.util.List;
import java.util.Optional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({TemplateController.class, SecurityConfig.class, TokenService.class})
@WithMockUser(roles = "TEMPLATE")
class TemplateControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TemplateService service;

    @MockitoBean
    private TemplateMapper mapper;

    @Test
    void givenTemplate_whenCreate_thenReturn201() throws Exception {

        Template template = TemplateTestData.validTemplate();
        Mockito.when(mapper.toDomain(Mockito.any(TemplateRequest.class))).thenReturn(template);
        Mockito.when(service.create(template)).thenReturn(template);
        Mockito.when(mapper.toResponse(template)).thenReturn(TemplateTestData.response());
        mockMvc.perform(post("/api/templates").contentType(MediaType.APPLICATION_JSON).content(TemplateTestData.validJson())).andExpect(status().isCreated());
    }

    @Test
    void givenTemplateExists_whenGetByName_thenReturn200() throws Exception {

        Template template = TemplateTestData.validTemplate();
        Mockito.when(service.findByName(TemplateTestData.templateName)).thenReturn(Optional.of(template));
        Mockito.when(mapper.toResponse(template)).thenReturn(TemplateTestData.response());
        mockMvc.perform(get("/api/templates/name/" + TemplateTestData.templateName)).andExpect(status().isOk());
    }

    @Test
    void givenTemplateName_whenDelete_thenReturn204() throws Exception {
        mockMvc.perform(delete("/api/templates/" + TemplateTestData.templateName)).andExpect(status().isNoContent());
        Mockito.verify(service).delete(TemplateTestData.templateName);
    }

    @Test
    void givenValidTemplate_whenUpdate_thenReturn200() throws Exception {
        Template template = TemplateTestData.validTemplate();
        Mockito.when(mapper.toDomain(Mockito.any(TemplateRequest.class))).thenReturn(template);

        Mockito.when(service.update(template)).thenReturn(template);
        Mockito.when(mapper.toResponse(template)).thenReturn(TemplateTestData.response());
        mockMvc.perform(put("/api/templates/" + TemplateTestData.templateName)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(TemplateTestData.validJson())).andExpect(status().isOk())
                .andExpect(MockMvcResultMatchers.jsonPath("$.name")
                        .value(TemplateTestData.templateName));
        Mockito.verify(service).update(template);
    }

    @Test
    void givenTemplateExists_whenGetbyId_thenReturn200() throws Exception {
        Template template = TemplateTestData.validTemplate();
        Mockito.when(service.findById(TemplateTestData.template_id)).thenReturn(Optional.of(template));
        Mockito.when(mapper.toResponse(template)).thenReturn(TemplateTestData.response());

        mockMvc.perform(get("/api/templates/" + TemplateTestData.template_id)).andExpect(status().isOk())
                .andExpect(MockMvcResultMatchers.jsonPath("$.name")
                        .value(TemplateTestData.templateName));
    }

    @Test
    void givenTemplates_whenGetAll_thenReturnPage() throws Exception {
        Template template = TemplateTestData.validTemplate();
        Mockito.when(service.findAll(new TemplateFilter(null, "def"), new PagingOptions(0, 2), "name", "desc"))
                .thenReturn(new PagingResult<>(List.of(template), 0, 2, 1, 1));
        Mockito.when(mapper.toResponse(template)).thenReturn(TemplateTestData.response());

        mockMvc.perform(get("/api/templates").param("name", "def").param("sortBy", "name").param("direction", "desc")
                        .param("pageNumber", "0").param("pageSize", "2"))
                .andExpect(status().isOk())
                .andExpect(MockMvcResultMatchers.jsonPath("$.content[0].name").value(TemplateTestData.templateName))
                .andExpect(MockMvcResultMatchers.jsonPath("$.totalElements").value(1));
    }

    @Test
    void givenTemplateMissing_whenGetById_thenReturn400WithMessage() throws Exception {
        Mockito.when(service.findById(5L)).thenReturn(Optional.empty());
        mockMvc.perform(get("/api/templates/5"))
                .andExpect(status().isBadRequest())
                .andExpect(MockMvcResultMatchers.content().string("No template named 5"));
    }

    @Test
    void givenTemplateMissing_whenGetByName_thenReturn400WithMessage() throws Exception {
        Mockito.when(service.findByName("nope")).thenReturn(Optional.empty());
        mockMvc.perform(get("/api/templates/name/nope"))
                .andExpect(status().isBadRequest())
                .andExpect(MockMvcResultMatchers.content().string("No template named nope"));
    }

    @Test
    void givenDuplicateName_whenCreate_thenReturn400WithMessage() throws Exception {
        Template template = TemplateTestData.validTemplate();
        Mockito.when(mapper.toDomain(Mockito.any(TemplateRequest.class))).thenReturn(template);
        Mockito.when(service.create(template)).thenThrow(new DuplicateTemplateException(TemplateTestData.templateName));
        mockMvc.perform(post("/api/templates").contentType(MediaType.APPLICATION_JSON).content(TemplateTestData.validJson()))
                .andExpect(status().isBadRequest())
                .andExpect(MockMvcResultMatchers.content().string("A template named 'default-template' already exists"));
    }

    @Test
    void givenDifferentNameInBody_whenUpdate_thenPathNameIsUsed() throws Exception {
        Template template = TemplateTestData.validTemplate();
        ArgumentCaptor<TemplateRequest> request = ArgumentCaptor.forClass(TemplateRequest.class);
        Mockito.when(mapper.toDomain(request.capture())).thenReturn(template);
        Mockito.when(service.update(template)).thenReturn(template);
        Mockito.when(mapper.toResponse(template)).thenReturn(TemplateTestData.response());

        mockMvc.perform(put("/api/templates/from-path").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"from-body\",\"fields\":[{\"name\":\"a\",\"length\":1}]}"))
                .andExpect(status().isOk());

        Assertions.assertEquals("from-path", request.getValue().getName());
    }

    @Test
    void givenInvalidSortField_whenGetAll_thenReturn400() throws Exception {
        Mockito.when(service.findAll(Mockito.any(), Mockito.any(), Mockito.eq("fields"), Mockito.any()))
                .thenThrow(new InvalidSortFieldException("fields"));
        mockMvc.perform(get("/api/templates").param("sortBy", "fields"))
                .andExpect(status().isBadRequest())
                .andExpect(MockMvcResultMatchers.content().string("Invalid sort field: fields"));
    }
}
