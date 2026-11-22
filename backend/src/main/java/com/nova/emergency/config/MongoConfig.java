package com.nova.emergency.config;

import com.nova.emergency.model.Incident;
import com.nova.emergency.model.RescueTeam;
import com.nova.emergency.model.Hospital;
import com.nova.emergency.model.Project;
import com.nova.emergency.model.Requirement;
import com.nova.emergency.model.RequirementVersion;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.MongoDatabaseFactory;
import org.springframework.data.mongodb.MongoTransactionManager;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@Configuration
@EnableMongoRepositories(basePackages = "com.nova.emergency.repository")
@EnableMongoAuditing
public class MongoConfig {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(MongoConfig.class);

    @Bean
    public MongoTransactionManager transactionManager(MongoDatabaseFactory dbFactory) {
        return new MongoTransactionManager(dbFactory);
    }

    @Bean
    public ApplicationRunner initMongoIndices(MongoTemplate mongoTemplate) {
        return args -> {
            try {
                // Incident operational query indices
                mongoTemplate.indexOps(Incident.class)
                    .ensureIndex(new Index().on("trackingCode", Sort.Direction.ASC));
                mongoTemplate.indexOps(Incident.class)
                    .ensureIndex(new Index().on("status", Sort.Direction.ASC).on("priority", Sort.Direction.ASC));
                mongoTemplate.indexOps(Incident.class)
                    .ensureIndex(new Index().on("severity", Sort.Direction.ASC).on("priority", Sort.Direction.ASC));
                mongoTemplate.indexOps(Incident.class)
                    .ensureIndex(new Index().on("type", Sort.Direction.ASC));
                mongoTemplate.indexOps(Incident.class)
                    .ensureIndex(new Index().on("reportedAt", Sort.Direction.DESC));

                // Rescue Team indices
                mongoTemplate.indexOps(RescueTeam.class)
                    .ensureIndex(new Index().on("status", Sort.Direction.ASC).on("district", Sort.Direction.ASC));

                // Hospital indices
                mongoTemplate.indexOps(Hospital.class)
                    .ensureIndex(new Index().on("district", Sort.Direction.ASC).on("isActive", Sort.Direction.ASC));

                // Project indices
                mongoTemplate.indexOps(Project.class)
                    .ensureIndex(new Index().on("ownerId", Sort.Direction.ASC).on("createdAt", Sort.Direction.DESC));
                mongoTemplate.indexOps(Project.class)
                    .ensureIndex(new Index().on("status", Sort.Direction.ASC));

                // Document indices
                mongoTemplate.indexOps(com.nova.emergency.model.Document.class)
                    .ensureIndex(new Index().on("projectId", Sort.Direction.ASC).on("createdAt", Sort.Direction.DESC));
                mongoTemplate.indexOps(com.nova.emergency.model.Document.class)
                    .ensureIndex(new Index().on("projectId", Sort.Direction.ASC).on("status", Sort.Direction.ASC));

                // Requirement indices
                mongoTemplate.indexOps(Requirement.class)
                    .ensureIndex(new Index().on("projectId", Sort.Direction.ASC).on("requirementKey", Sort.Direction.ASC).unique());
                mongoTemplate.indexOps(Requirement.class)
                    .ensureIndex(new Index().on("projectId", Sort.Direction.ASC).on("createdAt", Sort.Direction.DESC));
                mongoTemplate.indexOps(Requirement.class)
                    .ensureIndex(new Index().on("projectId", Sort.Direction.ASC).on("status", Sort.Direction.ASC));
                mongoTemplate.indexOps(Requirement.class)
                    .ensureIndex(new Index().on("projectId", Sort.Direction.ASC).on("priority", Sort.Direction.ASC));

                // RequirementVersion indices
                mongoTemplate.indexOps(RequirementVersion.class)
                    .ensureIndex(new Index().on("requirementId", Sort.Direction.ASC).on("versionNumber", Sort.Direction.ASC).unique());
                mongoTemplate.indexOps(RequirementVersion.class)
                    .ensureIndex(new Index().on("projectId", Sort.Direction.ASC).on("requirementId", Sort.Direction.ASC).on("versionNumber", Sort.Direction.DESC));
                mongoTemplate.indexOps(RequirementVersion.class)
                    .ensureIndex(new Index().on("projectId", Sort.Direction.ASC).on("reviewStatus", Sort.Direction.ASC));
                mongoTemplate.indexOps(RequirementVersion.class)
                    .ensureIndex(new Index().on("requirementId", Sort.Direction.ASC).on("reviewStatus", Sort.Direction.ASC));

                log.info("Verified all MongoDB operational indexes for Project NOVA.");
            } catch (Exception e) {
                log.warn("Could not verify/create MongoDB indexes: {}", e.getMessage());
            }
        };
    }
}

