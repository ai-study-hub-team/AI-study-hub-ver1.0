package com.aistudyhub.backend.security;

import com.aistudyhub.backend.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
public class JwtService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final JwtProperties properties;

    //TAO ACCESS TOKEN
    public String generateAccessToken(User user) {
        Instant now = Instant.now();

        return Jwts.builder()
                .subject(user.getEmail())
                .claim("userId", user.getId())
                .claim("role", user.getRole().name())
                .claim("type", "access")
                .issuedAt(Date.from(now))
                .expiration(Date.from(
                        now.plusMillis(properties.getAccessTokenExpiration())
                ))
                .signWith(getSigningKey())
                .compact();
    }

    //TAO REFRESH TOKEN DUNG DE XIN ACCESS TOKEN MOI KHI TOKEN CU HET HAN
    public String generateRefreshToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(bytes);
    }

    //HASH REFRESH TOKEN TRUOC KHI DUA VAO DB DE AN TOAN HON
    public String hashRefreshToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(
                    rawToken.getBytes(StandardCharsets.UTF_8)
            );
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(
                    "SHA-256 unavailable",
                    ex
            );
        }
    }

    //CHECK ACCESS TOKEN CO HOP LE HAY KHONG
    public boolean validateAccessToken(String token) {
        try {
            Claims claims = parseClaims(token);

            return "access".equals(claims.get("type", String.class))
                    && claims.getSubject() != null
                    && claims.get("role", String.class) != null
                    && claims.getExpiration().after(new Date());
        } catch (JwtException | IllegalArgumentException ex) {
            return false;
        }
    }

    public String extractEmail(String token) {
        return parseClaims(token).getSubject();
    }

    //TIME HET HAN TOKEN
    public long getRefreshTokenExpirationMillis() {
        return properties.getRefreshTokenExpiration();
    }

    //HAM PARSE TOKEN VA CHECK CHU KY NEU TOKEN BI SUA, SAI SERECT KEY, HET HAN HOAC FORMAT SAI THI SE LOI
    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    //Hàm này lấy JWT_SECRET từ config để kiểm tra sau đó tạo key để ký và verify JWT.
    private SecretKey getSigningKey() {
        String secret = properties.getSecretKey();
        
        if (secret == null || secret.isBlank() || secret.equals("${JWT_SECRET}")) {
            throw new IllegalStateException(
                    "JWT_SECRET is missing or not properly configured. " +
                    "Please set the JWT_SECRET environment variable or configure it in application-local.yml."
            );
        }

        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(secret);
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException(
                    "JWT_SECRET must be a valid standard Base64-encoded 256-bit key. " +
                    "Do not use raw strings or invalid characters like '_'.", e
            );
        }

        if (keyBytes.length < 32) {
            throw new IllegalStateException(
                    "JWT_SECRET must have at least 32 bytes (256 bits)."
            );
        }

        return Keys.hmacShaKeyFor(keyBytes);
    }
}
