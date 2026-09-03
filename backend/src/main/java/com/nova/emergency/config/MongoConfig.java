package com.nova.emergency.config;

import com.nova.emergency.model.User;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@Slf4j
@Configuration
@EnableMongoRepositories(basePackages = "com.nova.emergency.repository")
@EnableMongoAuditing
public class MongoConfig {

    @Bean
    public ApplicationRunner initMongoIndices(MongoTemplate mongoTemplate) {
        return args -> {
            try {
                mongoTemplate.indexOps(User.class)
                    .ensureIndex(new Index().on("email", Sort.Direction.ASC).unique());
                log.info("Verified unique index on User.email collection.");
            } catch (Exception e) {
                log.warn("Could not verify/create unique index on User.email: {}", e.getMessage());
            }
        };
    }
}

