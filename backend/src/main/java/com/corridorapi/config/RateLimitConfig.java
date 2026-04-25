package com.corridorapi.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class RateLimitConfig implements WebMvcConfigurer {

    private final RateLimitInterceptor rateLimitInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // Rate limiting disabled for now. Re-enable by re-registering rateLimitInterceptor:
        //   registry.addInterceptor(rateLimitInterceptor)
        //       .addPathPatterns("/api/**")
        //       .excludePathPatterns("/api/health", "/api/docs");
    }
}
