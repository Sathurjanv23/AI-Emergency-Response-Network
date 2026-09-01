package com.nova.emergency.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApiResponse<T> {
    private T data;
    private boolean success;
    private String message;
    private String timestamp;
    private Meta meta;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Meta {
        private Long total;
        private Integer page;
        private Integer pageSize;
    }

    public static <T> ApiResponse<T> ok(T data) {
        ApiResponse<T> response = new ApiResponse<>();
        response.setData(data);
        response.setSuccess(true);
        response.setTimestamp(Instant.now().toString());
        return response;
    }

    public static <T> ApiResponse<T> ok(T data, String message) {
        ApiResponse<T> response = ok(data);
        response.setMessage(message);
        return response;
    }

    public static <T> ApiResponse<T> error(String message) {
        ApiResponse<T> response = new ApiResponse<>();
        response.setSuccess(false);
        response.setMessage(message);
        response.setTimestamp(Instant.now().toString());
        return response;
    }
}
