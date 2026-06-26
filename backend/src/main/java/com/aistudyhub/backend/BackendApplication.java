package com.aistudyhub.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}

	@org.springframework.context.annotation.Bean
	public org.springframework.boot.CommandLineRunner logActiveDataSource(javax.sql.DataSource dataSource) {
		return args -> {
			try (java.sql.Connection conn = dataSource.getConnection()) {
				String url = conn.getMetaData().getURL();
				System.out.println("=========================================================");
				System.out.println("MAIN DATASOURCE URL = " + url);
				System.out.println("=========================================================");
			} catch (Exception e) {
				System.err.println("Failed to fetch database URL: " + e.getMessage());
			}
		};
	}

}
