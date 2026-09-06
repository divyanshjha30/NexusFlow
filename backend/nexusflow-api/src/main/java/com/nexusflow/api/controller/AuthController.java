package com.nexusflow.api.controller;

import com.nexusflow.common.exception.NexusFlowException;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AdminConfirmSignUpRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AttributeType;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AuthFlowType;
import software.amazon.awssdk.services.cognitoidentityprovider.model.InitiateAuthRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.InitiateAuthResponse;
import software.amazon.awssdk.services.cognitoidentityprovider.model.InvalidPasswordException;
import software.amazon.awssdk.services.cognitoidentityprovider.model.NotAuthorizedException;
import software.amazon.awssdk.services.cognitoidentityprovider.model.SignUpRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.UserNotFoundException;
import software.amazon.awssdk.services.cognitoidentityprovider.model.UsernameExistsException;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private static final int MIN_PASSWORD_LENGTH = 8;

    private final CognitoIdentityProviderClient cognito;
    private final String clientId;
    private final String userPoolId;

    public AuthController(
            CognitoIdentityProviderClient cognito,
            @org.springframework.beans.factory.annotation.Value("${nexusflow.cognito.client-id}") String clientId,
            @org.springframework.beans.factory.annotation.Value("${nexusflow.cognito.user-pool-id}") String userPoolId) {
        this.cognito = cognito;
        this.clientId = clientId;
        this.userPoolId = userPoolId;
    }

    public record LoginRequest(String email, String password) {}

    public record RegisterRequest(String email, String password) {}

    public record RefreshRequest(String refreshToken) {}

    public record TokenResponse(String idToken, String accessToken, String refreshToken, int expiresIn) {}

    /**
     * Signs the user up and confirms them immediately: there is no mail delivery
     * in this environment, so an emailed code would strand the account.
     */
    @PostMapping("/register")
    public TokenResponse register(@RequestBody RegisterRequest request) {
        if (request.email() == null || request.email().isBlank()
                || request.password() == null || request.password().isBlank()) {
            throw new NexusFlowException("INVALID_REGISTRATION", "Email and password are required");
        }
        // The local Cognito emulator enforces no password policy, so the floor is set here.
        if (request.password().length() < MIN_PASSWORD_LENGTH) {
            throw new NexusFlowException("WEAK_PASSWORD",
                    "Password must be at least " + MIN_PASSWORD_LENGTH + " characters");
        }

        try {
            cognito.signUp(SignUpRequest.builder()
                    .clientId(clientId)
                    .username(request.email())
                    .password(request.password())
                    .userAttributes(AttributeType.builder()
                            .name("email").value(request.email()).build())
                    .build());

            cognito.adminConfirmSignUp(AdminConfirmSignUpRequest.builder()
                    .userPoolId(userPoolId)
                    .username(request.email())
                    .build());
        } catch (UsernameExistsException e) {
            throw new NexusFlowException("EMAIL_TAKEN", "An account with that email already exists");
        } catch (InvalidPasswordException e) {
            throw new NexusFlowException("WEAK_PASSWORD", e.awsErrorDetails().errorMessage());
        }

        return login(new LoginRequest(request.email(), request.password()));
    }

    @PostMapping("/login")
    public TokenResponse login(@RequestBody LoginRequest request) {
        try {
            InitiateAuthResponse response = cognito.initiateAuth(InitiateAuthRequest.builder()
                    .clientId(clientId)
                    .authFlow(AuthFlowType.USER_PASSWORD_AUTH)
                    .authParameters(Map.of(
                            "USERNAME", request.email(),
                            "PASSWORD", request.password()))
                    .build());

            var result = response.authenticationResult();
            if (result == null) {
                throw new NexusFlowException("AUTH_CHALLENGE",
                        "Additional authentication challenge required: " + response.challengeNameAsString());
            }
            return new TokenResponse(
                    result.idToken(), result.accessToken(), result.refreshToken(), result.expiresIn());
        } catch (NotAuthorizedException | UserNotFoundException e) {
            throw new NexusFlowException("INVALID_CREDENTIALS", "Incorrect email or password");
        }
    }

    @PostMapping("/refresh")
    public TokenResponse refresh(@RequestBody RefreshRequest request) {
        try {
            InitiateAuthResponse response = cognito.initiateAuth(InitiateAuthRequest.builder()
                    .clientId(clientId)
                    .authFlow(AuthFlowType.REFRESH_TOKEN_AUTH)
                    .authParameters(Map.of("REFRESH_TOKEN", request.refreshToken()))
                    .build());

            var result = response.authenticationResult();
            if (result == null) {
                throw new NexusFlowException("REFRESH_FAILED", "Could not refresh the session");
            }
            // Cognito omits the refresh token on refresh; keep the caller's existing one.
            return new TokenResponse(
                    result.idToken(), result.accessToken(), request.refreshToken(), result.expiresIn());
        } catch (NotAuthorizedException e) {
            throw new NexusFlowException("SESSION_EXPIRED", "Please sign in again");
        }
    }
}
