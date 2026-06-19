package com.aistudyhub.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import javax.sql.DataSource;

/**
 * Configures a separate JDBC DataSource + JdbcTemplate for the pgvector database.
 *
 * <p>This is intentionally separate from the main Spring DataSource (port 5432)
 * so that pgvector queries go to the dedicated pgvector PostgreSQL instance
 * (port 5433). The main datasource continues to serve JPA/Hibernate operations.</p>
 *
 * <p>The bean is named "pgvectorJdbcTemplate" to avoid colliding with the default
 * JdbcTemplate that Spring Boot auto-configures.</p>
 */
@Configuration
public class PgvectorDataSourceConfig {

    @Value("${pgvector.datasource.url}")
    private String pgvectorUrl;

    @Value("${pgvector.datasource.username}")
    private String pgvectorUsername;

    @Value("${pgvector.datasource.password}")
    private String pgvectorPassword;

    @Bean("pgvectorDataSource")
    public DataSource pgvectorDataSource() {
        DriverManagerDataSource ds = new DriverManagerDataSource();
        ds.setDriverClassName("org.postgresql.Driver");
        ds.setUrl(pgvectorUrl);
        ds.setUsername(pgvectorUsername);
        ds.setPassword(pgvectorPassword);
        return ds;
    }

    @Bean("pgvectorJdbcTemplate")
    public JdbcTemplate pgvectorJdbcTemplate() {
        return new JdbcTemplate(pgvectorDataSource());
    }
}
