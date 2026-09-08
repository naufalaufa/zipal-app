-- New versioned workflow. Legacy agreement_signatures is deliberately preserved.
CREATE TABLE IF NOT EXISTS agreements (
    id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
    agreement_number VARCHAR(100) NOT NULL UNIQUE,
    content_json JSON NOT NULL,
    content_hash CHAR(64) NOT NULL,
    status ENUM('DRAFT', 'WAITING_EMETERAI', 'FINAL') NOT NULL DEFAULT 'DRAFT',
    approved_by BIGINT UNSIGNED NULL,
    approved_at DATETIME(3) NULL,
    draft_pdf MEDIUMBLOB NULL,
    draft_sha256 CHAR(64) NULL,
    final_pdf MEDIUMBLOB NULL,
    final_sha256 CHAR(64) NULL,
    finalized_by BIGINT UNSIGNED NULL,
    finalized_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS agreement_applications (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    agreement_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    party ENUM('zihra', 'naufal') NOT NULL,
    signature_image MEDIUMTEXT NOT NULL,
    applied BOOLEAN NOT NULL DEFAULT TRUE,
    content_hash CHAR(64) NOT NULL,
    signed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_agreement_party (agreement_id, party),
    UNIQUE KEY uq_agreement_user (agreement_id, user_id),
    CONSTRAINT fk_application_agreement FOREIGN KEY (agreement_id) REFERENCES agreements(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
