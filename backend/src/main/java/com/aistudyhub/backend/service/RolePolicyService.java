package com.aistudyhub.backend.service;

import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.enums.UserRole;
import com.aistudyhub.backend.exception.ForbiddenException;
import org.springframework.stereotype.Service;

@Service
public class RolePolicyService {

    public boolean isAdmin(User user) {
        return user != null && user.getRole() == UserRole.ADMIN;
    }

    public boolean isManager(User user) {
        return user != null && user.getRole() == UserRole.MANAGER;
    }

    public boolean isManagementAccount(User user) {
        return user != null
                && (user.getRole() == UserRole.ADMIN
                || user.getRole() == UserRole.MANAGER);
    }

    public void requireAdmin(User currentUser, String message) {
        if (!isAdmin(currentUser)) {
            throw new ForbiddenException(message);
        }
    }

    public void requireCanManageAccount(User currentUser, User targetUser) {
        if (currentUser == null || targetUser == null) {
            throw new ForbiddenException("You do not have permission to manage this account");
        }

        if (currentUser.getRole() == UserRole.ADMIN) {
            return;
        }

        if (currentUser.getRole() == UserRole.MANAGER
                && targetUser.getRole() == UserRole.USER) {
            return;
        }

        throw new ForbiddenException("Managers can only manage regular user accounts");
    }

    public boolean canSeeUserInManagement(User currentUser, User targetUser) {
        if (currentUser == null || targetUser == null) {
            return false;
        }

        if (currentUser.getRole() == UserRole.ADMIN) {
            return true;
        }

        return currentUser.getRole() == UserRole.MANAGER
                && targetUser.getRole() == UserRole.USER;
    }

    public void requireUserSubscriptionTarget(User targetUser) {
        if (targetUser == null || targetUser.getRole() != UserRole.USER) {
            throw new ForbiddenException("Subscriptions apply only to regular user accounts");
        }
    }
}