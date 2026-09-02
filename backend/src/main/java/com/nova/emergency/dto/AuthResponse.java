package com.nova.emergency.dto;

import com.nova.emergency.model.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String accessToken;
    private String tokenType = "Bearer";
    private long expiresIn;   // seconds
    private UserDto user;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserDto {
        private String id;
        private String name;
        private String email;
        private String role;
        private String status;
        private String phone;
        private String district;
        private String organization;
        private String language;
        private String createdAt;
        private String lastActive;
        private boolean isActive;
        private boolean isVerified;

        public static UserDto from(User user) {
            UserDto dto = new UserDto();
            dto.setId(user.getId());
            dto.setName(user.getName());
            dto.setEmail(user.getEmail());
            dto.setRole(user.getRole());
            dto.setStatus(user.getStatus() != null ? user.getStatus() : (user.isActive() ? "ACTIVE" : "DEACTIVATED"));
            dto.setPhone(user.getPhone());
            dto.setDistrict(user.getDistrict());
            dto.setOrganization(user.getOrganization());
            dto.setLanguage(user.getLanguage());
            dto.setCreatedAt(user.getCreatedAt());
            dto.setLastActive(user.getLastActive());
            dto.setActive(user.isActive());
            dto.setVerified(user.isVerified());
            return dto;
        }
    }
}
