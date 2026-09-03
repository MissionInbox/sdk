package com.missioninbox;

import com.missioninbox.exceptions.AuthenticationException;
import com.missioninbox.exceptions.ConflictException;
import com.missioninbox.exceptions.DomainBlacklistedException;
import com.missioninbox.exceptions.NotFoundException;
import com.missioninbox.exceptions.PermissionException;
import com.missioninbox.exceptions.RateLimitException;
import com.missioninbox.exceptions.SendException;
import com.missioninbox.exceptions.SendLimitExceededException;
import com.missioninbox.exceptions.ServerException;
import com.missioninbox.exceptions.SubscriptionInactiveException;
import com.missioninbox.exceptions.UnregisteredSenderException;
import com.missioninbox.exceptions.UnverifiedDomainException;
import com.missioninbox.exceptions.ValidationException;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

final class ErrorsTest {

    private MissionInbox newClient(MockServer server) {
        return MissionInbox.builder()
                .apiKey("test-key")
                .baseUrl(server.baseUrl())
                .maxRetries(0)
                .timeout(Duration.ofSeconds(5))
                .build();
    }

    private void run(int status, String message, Class<? extends Throwable> expected) throws Exception {
        try (MockServer server = new MockServer()) {
            server.enqueueJson(status, Map.of("statusCode", status, "message", message));
            MissionInbox mi = newClient(server);
            Throwable actual = assertThrows(Throwable.class, () -> mi.emails.send(Map.of(
                    "from", "a@b.com", "to", "c@d.com", "subject", "s", "text", "t"
            )));
            assertTrue(expected.isInstance(actual),
                    "expected " + expected.getSimpleName() + " but got " + actual.getClass().getSimpleName());
        }
    }

    @Test void _401() throws Exception { run(401, "Invalid credentials", AuthenticationException.class); }
    @Test void _403_unregistered() throws Exception {
        run(403, "x@y.com is not a registered sending identifier. Register it before sending.", UnregisteredSenderException.class);
    }
    @Test void _403_unverified() throws Exception {
        run(403, "x@y.com cannot send yet: its domain y.com is not verified for sending (dns_pending).", UnverifiedDomainException.class);
    }
    @Test void _403_subscription() throws Exception {
        run(403, "Your subscription is not active. Please contact support.", SubscriptionInactiveException.class);
    }
    @Test void _403_send_limit() throws Exception {
        run(403, "Daily send limit of 20 reached for the Free plan.", SendLimitExceededException.class);
    }
    @Test void _403_blacklisted() throws Exception {
        run(403, "This domain is listed on Spamhaus and it's disabled for sending.", DomainBlacklistedException.class);
    }
    @Test void _400() throws Exception { run(400, "From address is required", ValidationException.class); }
    @Test void _404() throws Exception { run(404, "Not found", NotFoundException.class); }
    @Test void _409() throws Exception { run(409, "already registered", ConflictException.class); }
    @Test void _422() throws Exception { run(422, "Failed to send email: SES rejected the message", SendException.class); }
    @Test void _429() throws Exception { run(429, "Too many requests", RateLimitException.class); }
    @Test void _500() throws Exception { run(500, "Internal error", ServerException.class); }

    @Test
    void _403_generic_is_base_permission_not_subclass() throws Exception {
        try (MockServer server = new MockServer()) {
            server.enqueueJson(403, Map.of("message", "Forbidden."));
            MissionInbox mi = newClient(server);
            Throwable actual = assertThrows(PermissionException.class, () -> mi.emails.send(Map.of(
                    "from", "a@b.com", "to", "c@d.com", "subject", "s", "text", "t"
            )));
            assertSame(PermissionException.class, actual.getClass(),
                    "Should be base PermissionException, not a specific subclass");
        }
    }
}
