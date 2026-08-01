package com.astratabi.delivery.common;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ApiError> handleApi(ApiException exception, HttpServletRequest request) {
        return ResponseEntity.status(exception.status()).body(ApiError.of(exception.code(), exception.getMessage(), request));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException exception, HttpServletRequest request) {
        Map<String, String> fields = new LinkedHashMap<>();
        for (FieldError error : exception.getBindingResult().getFieldErrors()) {
            fields.putIfAbsent(error.getField(), error.getDefaultMessage());
        }
        return ResponseEntity.badRequest().body(ApiError.of("VALIDATION_ERROR", "入力内容を確認してください。", request, fields));
    }

    @ExceptionHandler(MissingServletRequestPartException.class)
    ResponseEntity<ApiError> handleMissingUploadPart(MissingServletRequestPartException exception, HttpServletRequest request) {
        return ResponseEntity.badRequest().body(ApiError.of("PACKAGE_UPLOAD_PART_REQUIRED", "请同时上传 ZIP 和对应的 .sha256 文件。", request));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<ApiError> handleUploadLimit(MaxUploadSizeExceededException exception, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(ApiError.of("PACKAGE_TOO_LARGE", "上传资料包超过服务器允许的大小。", request));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> handleUnexpected(Exception exception, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiError.of("INTERNAL_ERROR", "処理に失敗しました。", request));
    }

    public record ApiError(String code, String message, Instant timestamp, String path, Map<String, String> fields) {
        static ApiError of(String code, String message, HttpServletRequest request) {
            return of(code, message, request, Map.of());
        }

        static ApiError of(String code, String message, HttpServletRequest request, Map<String, String> fields) {
            return new ApiError(code, message, Instant.now(), request.getRequestURI(), fields);
        }
    }
}
