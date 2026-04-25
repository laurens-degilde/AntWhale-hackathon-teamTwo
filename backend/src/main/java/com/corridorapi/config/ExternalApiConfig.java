package com.corridorapi.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "external")
@Getter
@Setter
public class ExternalApiConfig {

    private Inaturalist inaturalist = new Inaturalist();
    private Gbif gbif = new Gbif();
    private Copernicus copernicus = new Copernicus();
    private Overpass overpass = new Overpass();
    private Rijkswaterstaat rijkswaterstaat = new Rijkswaterstaat();
    private Solvimon solvimon = new Solvimon();

    @Getter
    @Setter
    public static class Inaturalist {
        private String baseUrl;
    }

    @Getter
    @Setter
    public static class Gbif {
        private String baseUrl;
    }

    @Getter
    @Setter
    public static class Copernicus {
        private String baseUrl;
    }

    @Getter
    @Setter
    public static class Overpass {
        private String baseUrl;
    }

    @Getter
    @Setter
    public static class Rijkswaterstaat {
        private String baseUrl;
    }

    @Getter
    @Setter
    public static class Solvimon {
        private String baseUrl;
        private String apiKey;
    }
}
