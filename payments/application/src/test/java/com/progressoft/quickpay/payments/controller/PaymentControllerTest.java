package com.progressoft.quickpay.payments.controller;

import com.progressoft.quickpay.payments.PaymentTestData;
import com.progressoft.quickpay.payments.domain.exception.InvalidSortFieldException;
import com.progressoft.quickpay.payments.domain.exception.SystemViolationException;
import com.progressoft.quickpay.payments.domain.model.payment.BulkError;
import com.progressoft.quickpay.payments.domain.model.payment.BulkUploadResult;
import com.progressoft.quickpay.payments.domain.model.payment.Payment;
import com.progressoft.quickpay.payments.domain.model.payment.PaymentStatus;
import com.progressoft.quickpay.payments.domain.model.violation.Violation;
import com.progressoft.quickpay.payments.exception.GlobalExceptionHandler;
import com.progressoft.quickpay.payments.mapper.PaymentMapperImpl;
import com.progressoft.quickpay.payments.repository.models.PaymentFilter;
import com.progressoft.quickpay.payments.resources.paging.PagingOptions;
import com.progressoft.quickpay.payments.resources.paging.PagingResult;
import com.progressoft.quickpay.payments.security.SecurityConfig;
import com.progressoft.quickpay.payments.security.TokenService;
import com.progressoft.quickpay.payments.service.PaymentService;
import com.progressoft.training.fileparser.exception.FileParserException;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PaymentController.class)
@Import({GlobalExceptionHandler.class, PaymentMapperImpl.class, SecurityConfig.class, TokenService.class})
@WithMockUser(roles = "PAYMENT")
class PaymentControllerTest {

    private static final Long payment_id = PaymentTestData.PAYMENT_ID;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PaymentService service;

    @Test
    void givenValidPayment_whenPost_thenReturn201() throws Exception {
        mockMvc.perform(post("/api/payments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(PaymentTestData.validJson()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.creditorName").value("Tolay Khamis"));
        Mockito.verify(service).create(Mockito.any(Payment.class));
    }

    @Test
    void givenPaymentExists_whenGetById_thenReturn200() throws Exception {
        Mockito.when(service.findBy(payment_id))
                .thenReturn(Optional.of(PaymentTestData.savedPayment(payment_id)));
        mockMvc.perform(get("/api/payments/" + payment_id)).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(PaymentStatus.PENDING.name()));
    }

    @Test
    void givenPaymentsExist_whenGetAll_thenReturn200() throws Exception {
        Mockito.when(service.findAll(Mockito.any(PaymentFilter.class),
                        Mockito.any(PagingOptions.class),
                        Mockito.eq("id"),
                        Mockito.eq("asc")))
                .thenReturn(new PagingResult<>(List.of(PaymentTestData.savedPayment(payment_id),
                        PaymentTestData.savedPayment(payment_id + 1)), 0, 10, 2, 1));

        mockMvc.perform(get("/api/payments"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.content[0].id").value(payment_id)).andExpect(jsonPath("$.content[1].id").value(payment_id + 1));
    }

    @Test
    void givenPaymentMissing_whenGetById_thenReturn404() throws Exception {
        Mockito.when(service.findBy(payment_id)).thenReturn(Optional.empty());
        mockMvc.perform(get("/api/payments/" + payment_id))
                .andExpect(status().isNotFound());
    }

    @Test
    void givenValidBulkFile_whenUploadBulk_thenReturn200() throws Exception {
        Mockito.when(service.uploadBulk(Mockito.eq("default"), Mockito.any())).thenReturn(null);
        mockMvc.perform(multipart("/api/payments/bulk").file(PaymentTestData.bulkFile())
                .file(PaymentTestData.metadataFile())).andExpect(status().isOk());
        Mockito.verify(service).uploadBulk(Mockito.eq("default"), Mockito.any());
    }

    @Test
    void givenInvalidPayment_whenPost_thenReturn400WithViolations() throws Exception {
        Mockito.doThrow(new SystemViolationException(Set.of(new Violation("amount must be greater than zero", "amount"))))
                .when(service).create(Mockito.any(Payment.class));
        mockMvc.perform(post("/api/payments").contentType(MediaType.APPLICATION_JSON).content(PaymentTestData.validJson()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$[0].violator").value("amount"))
                .andExpect(jsonPath("$[0].message").value("amount must be greater than zero"));
    }

    @Test
    void givenPaddedJson_whenPost_thenServiceReceivesTrimmedAndNormalizedPayment() throws Exception {
        String json = """
                {"senderAccount":" ACC-1 ","receiverAccount":"ACC-2","amount":10.100,
                 "currency":" JOD","notes":"  ","creditorName":" Tolay Khamis "}""";
        ArgumentCaptor<Payment> captor = ArgumentCaptor.forClass(Payment.class);

        mockMvc.perform(post("/api/payments").contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated());

        Mockito.verify(service).create(captor.capture());
        Payment payment = captor.getValue();
        Assertions.assertEquals("ACC-1", payment.getSenderAccount());
        Assertions.assertEquals("JOD", payment.getCurrency());
        Assertions.assertEquals("Tolay Khamis", payment.getCreditorName());
        Assertions.assertNull(payment.getNotes());
        Assertions.assertEquals(new BigDecimal("10.10"), payment.getAmount());
    }

    @Test
    void givenMalformedJson_whenPost_thenReturn400() throws Exception {
        mockMvc.perform(post("/api/payments").contentType(MediaType.APPLICATION_JSON).content("{bad"))
                .andExpect(status().isBadRequest());
        Mockito.verifyNoInteractions(service);
    }

    @Test
    void givenPaymentMissing_whenGetById_thenBodyExplainsWhy() throws Exception {
        Mockito.when(service.findBy(payment_id)).thenReturn(Optional.empty());
        mockMvc.perform(get("/api/payments/" + payment_id))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Payment not found with this id: " + payment_id));
    }

    @Test
    void givenFiltersAndPaging_whenGetAll_thenPassedToService() throws Exception {
        ArgumentCaptor<PaymentFilter> filter = ArgumentCaptor.forClass(PaymentFilter.class);
        ArgumentCaptor<PagingOptions> paging = ArgumentCaptor.forClass(PagingOptions.class);
        Mockito.when(service.findAll(filter.capture(), paging.capture(), Mockito.eq("amount"), Mockito.eq("desc")))
                .thenReturn(new PagingResult<>(List.of(), 1, 5, 0, 0));

        mockMvc.perform(get("/api/payments")
                        .param("currency", "USD").param("status", "PENDING").param("minAmount", "10")
                        .param("createdFrom", "2026-09-25T00:00:00Z")
                        .param("pageNumber", "1").param("pageSize", "5").param("sortBy", "amount").param("direction", "desc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pageNumber").value(1))
                .andExpect(jsonPath("$.pageSize").value(5));

        Assertions.assertEquals("USD", filter.getValue().currency());
        Assertions.assertEquals(PaymentStatus.PENDING, filter.getValue().status());
        Assertions.assertEquals(new BigDecimal("10"), filter.getValue().minAmount());
        Assertions.assertEquals(Instant.parse("2026-09-25T00:00:00Z"), filter.getValue().createdFrom());
        Assertions.assertEquals(new PagingOptions(1, 5), paging.getValue());
    }

    @Test
    void givenInvalidPageSize_whenGetAll_thenReturn400WithMessage() throws Exception {
        mockMvc.perform(get("/api/payments").param("pageSize", "0"))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Page size must be between 1 and 100"));
    }

    @Test
    void givenInvalidSortField_whenGetAll_thenReturn400WithMessage() throws Exception {
        Mockito.when(service.findAll(Mockito.any(), Mockito.any(), Mockito.eq("foo"), Mockito.any()))
                .thenThrow(new InvalidSortFieldException("foo"));
        mockMvc.perform(get("/api/payments").param("sortBy", "foo"))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Invalid sort field: foo"));
    }

    @Test
    void givenBulkFileWithoutMetadata_whenUploadBulk_thenDefaultTemplateIsUsed() throws Exception {
        Mockito.when(service.uploadBulk(Mockito.eq("default"), Mockito.any()))
                .thenReturn(new BulkUploadResult(1, 1, List.of(PaymentTestData.validPayment()),
                        List.of(new BulkError(3, List.of("amount: is required but was empty")))));

        mockMvc.perform(multipart("/api/payments/bulk").file(PaymentTestData.bulkFile()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.successCount").value(1))
                .andExpect(jsonPath("$.failureCount").value(1))
                .andExpect(jsonPath("$.validRows[0].senderAccount").value("ACC-1"))
                .andExpect(jsonPath("$.failures[0].rowNumber").value(3));
    }

    @Test
    void givenMetadataWithCustomTemplate_whenUploadBulk_thenThatTemplateIsUsed() throws Exception {
        MockMultipartFile metadata = new MockMultipartFile("metadata", "", "application/json",
                "{\"templateName\":\"custom\"}".getBytes());
        mockMvc.perform(multipart("/api/payments/bulk").file(PaymentTestData.bulkFile()).file(metadata))
                .andExpect(status().isOk());
        Mockito.verify(service).uploadBulk(Mockito.eq("custom"), Mockito.any());
    }

    @Test
    void givenParserFailure_whenUploadBulk_thenReturn400WithMessage() throws Exception {
        Mockito.when(service.uploadBulk(Mockito.any(), Mockito.any())).thenThrow(new FileParserException("File type not supported"));
        mockMvc.perform(multipart("/api/payments/bulk").file(PaymentTestData.bulkFile()))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("File type not supported"));
    }
}
