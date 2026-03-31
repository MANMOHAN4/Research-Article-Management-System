-- ============================================================
-- SEED DATA for research_article_management
-- Populates all core tables with realistic sample data
-- Run AFTER new_schema_v2.sql
-- ============================================================

USE research_article_management;

-- ============================================================
-- TRUNCATE all tables before seeding (order matters — FKs)
-- ============================================================
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE FunctionalDependencies;
TRUNCATE TABLE PerformanceHealthSnapshots;
TRUNCATE TABLE PerformanceHourlyMetrics;
TRUNCATE TABLE PerformanceTableStats;
TRUNCATE TABLE PerformanceAlerts;
TRUNCATE TABLE PerformanceSlowQueries;
TRUNCATE TABLE PerformanceQueryLog;
TRUNCATE TABLE Citation;
TRUNCATE TABLE Review;
TRUNCATE TABLE ArticleKeyword;
TRUNCATE TABLE ArticleAuthor;
TRUNCATE TABLE Keyword;
TRUNCATE TABLE Reviewer;
TRUNCATE TABLE Author;
TRUNCATE TABLE ResearchArticle;
TRUNCATE TABLE Conference;
TRUNCATE TABLE Journal;
TRUNCATE TABLE UserAccount;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 1. UserAccount
-- ============================================================
INSERT INTO UserAccount (Username, PasswordHash, Email, Affiliation, ORCID, Role) VALUES
('alice_smith',    '$2b$10$examplehashalice',   'alice@university.edu',   'MIT',             '0000-0001-1111-1111', 'Author'),
('bob_jones',      '$2b$10$examplehashbob',     'bob@research.org',       'Stanford',        '0000-0002-2222-2222', 'Author'),
('carol_white',    '$2b$10$examplehashcarol',   'carol@lab.edu',          'Harvard',         '0000-0003-3333-3333', 'Reviewer'),
('david_brown',    '$2b$10$examplehashdavid',   'david@institute.org',    'Oxford',          '0000-0004-4444-4444', 'Reviewer'),
('eve_admin',      '$2b$10$examplehasheve',     'eve@admin.edu',          'IEEE',            '0000-0005-5555-5555', 'Admin'),
('frank_miller',   '$2b$10$examplehashfrank',   'frank@university.edu',   'Cambridge',       '0000-0006-6666-6666', 'Author'),
('grace_lee',      '$2b$10$examplehashgrace',   'grace@research.edu',     'Caltech',         '0000-0007-7777-7777', 'Reviewer'),
('henry_wilson',   '$2b$10$examplehashhunry',   'henry@lab.org',          'Princeton',       '0000-0008-8888-8888', 'Author');

-- ============================================================
-- 2. Journal
-- ============================================================
INSERT INTO Journal (Name, Publisher, ISSN, ImpactFactor) VALUES
('Nature',                          'Springer Nature',    '0028-0836', 9.999),
('IEEE Transactions on Computers',  'IEEE',               '0018-9340',  3.131),
('ACM Computing Surveys',           'ACM',                '0360-0300',  6.131),
('Journal of Machine Learning',     'JMLR',               '1532-4435',  4.988);

-- ============================================================
-- 3. Conference
-- ============================================================
INSERT INTO Conference (Name, Location, StartDate, EndDate) VALUES
('NeurIPS 2024',       'Vancouver, Canada',    '2024-12-09', '2024-12-15'),
('CVPR 2024',          'Seattle, USA',         '2024-06-17', '2024-06-21'),
('ICSE 2025',          'Ottawa, Canada',       '2025-04-27', '2025-05-03'),
('VLDB 2025',          'London, UK',           '2025-08-25', '2025-08-29');

-- ============================================================
-- 4. ResearchArticle
-- ============================================================
INSERT INTO ResearchArticle (Title, Abstract, DOI, SubmissionDate, Status, PublicationType, JournalID, ConferenceID) VALUES
('Deep Learning for Natural Language Processing',
 'This paper presents a comprehensive survey of deep learning techniques applied to NLP tasks including classification, translation, and summarization.',
 '10.1000/nature.001', '2024-01-15', 'Published',    'Journal',      1, NULL),

('Efficient Query Optimization in Distributed Databases',
 'We propose a novel cost-based query optimizer for distributed database systems that reduces execution time by 40% on benchmark workloads.',
 '10.1109/tc.002',     '2024-02-20', 'Published',    'Journal',      2, NULL),

('A Survey on Transformer Architectures',
 'Transformers have revolutionized NLP and computer vision. This survey covers the evolution from BERT to GPT-4 and beyond.',
 '10.1145/acm.003',    '2024-03-10', 'Accepted',     'Journal',      3, NULL),

('Reinforcement Learning in Robotics',
 'We demonstrate real-time reinforcement learning algorithms applied to robotic manipulation tasks with sample efficiency improvements.',
 '10.neurips.004',     '2024-04-05', 'Published',    'Conference',   NULL, 1),

('Federated Learning with Differential Privacy',
 'A privacy-preserving federated learning framework that achieves competitive accuracy while providing formal differential privacy guarantees.',
 '10.cvpr.005',        '2024-05-12', 'Under Review', 'Conference',   NULL, 2),

('Graph Neural Networks for Knowledge Graphs',
 'This paper introduces GraphKG, a novel GNN architecture tailored for large-scale knowledge graph completion and reasoning.',
 '10.1000/nature.006', '2024-06-18', 'Submitted',    'Journal',      1, NULL),

('Containerization of Automotive ECU Software',
 'We explore Docker-based containerization strategies for automotive infotainment ECUs, enabling modular OTA updates.',
 '10.icse.007',        '2024-07-22', 'Accepted',     'Conference',   NULL, 3),

('Lossless Join Decomposition in Relational Databases',
 'A formal treatment of lossless join decomposition with practical algorithms for schema normalization up to BCNF.',
 '10.vldb.008',        '2024-08-30', 'Published',    'Conference',   NULL, 4),

('Zero-Shot Learning via Semantic Embeddings',
 'We propose a zero-shot learning framework using cross-modal semantic embeddings to generalize to unseen categories.',
 '10.jmlr.009',        '2024-09-14', 'Under Review', 'Journal',      4, NULL),

('Microservices Architecture for Cloud-Native Applications',
 'Design patterns and anti-patterns for building resilient, scalable microservices on cloud platforms are analyzed.',
 NULL,                 '2024-10-01', 'Submitted',    'Unpublished',  NULL, NULL);

-- ============================================================
-- 5. Author  (registered — UserID only, Name NULL)
-- ============================================================
INSERT INTO Author (Name, Affiliation, ORCID, UserID) VALUES
(NULL, NULL, NULL, 1),   -- alice_smith
(NULL, NULL, NULL, 2),   -- bob_jones
(NULL, NULL, NULL, 6),   -- frank_miller
(NULL, NULL, NULL, 8);   -- henry_wilson

-- Guest authors (no UserID)
INSERT INTO Author (Name, Affiliation, ORCID, UserID) VALUES
('Dr. John Park',      'Seoul National University', '0000-0009-9999-0001', NULL),
('Prof. Maria Garcia', 'TU Berlin',                 '0000-0009-9999-0002', NULL),
('Dr. Liang Chen',     'Tsinghua University',       '0000-0009-9999-0003', NULL);

-- ============================================================
-- 6. Reviewer  (registered — UserID only, Name NULL)
-- ============================================================
INSERT INTO Reviewer (Name, Affiliation, ExpertiseArea, UserID) VALUES
(NULL, NULL, 'Machine Learning',           3),   -- carol_white
(NULL, NULL, 'Database Systems',           4),   -- david_brown
(NULL, NULL, 'Computer Vision',            7);   -- grace_lee

-- Guest reviewers
INSERT INTO Reviewer (Name, Affiliation, ExpertiseArea, UserID) VALUES
('Dr. Samuel Torres', 'ETH Zurich',      'Distributed Systems', NULL),
('Prof. Yuki Tanaka',  'Osaka University', 'Robotics',           NULL);

-- ============================================================
-- 7. Keyword
-- ============================================================
INSERT INTO Keyword (KeywordText) VALUES
('deep learning'),
('natural language processing'),
('transformer'),
('query optimization'),
('distributed databases'),
('reinforcement learning'),
('robotics'),
('federated learning'),
('differential privacy'),
('graph neural networks'),
('knowledge graphs'),
('containerization'),
('automotive software'),
('lossless join'),
('normalization'),
('zero-shot learning'),
('semantic embeddings'),
('microservices'),
('cloud computing'),
('computer vision');

-- ============================================================
-- 8. ArticleAuthor
-- ============================================================
INSERT INTO ArticleAuthor (ArticleID, AuthorID) VALUES
(1, 1),  -- alice on article 1
(1, 5),  -- Dr. John Park on article 1
(2, 2),  -- bob on article 2
(2, 6),  -- Prof. Maria Garcia on article 2
(3, 1),  -- alice on article 3
(3, 3),  -- frank on article 3
(4, 4),  -- henry on article 4
(4, 7),  -- Dr. Liang Chen on article 4
(5, 2),  -- bob on article 5
(5, 5),  -- Dr. John Park on article 5
(6, 3),  -- frank on article 6
(6, 6),  -- Prof. Maria Garcia on article 6
(7, 4),  -- henry on article 7
(7, 7),  -- Dr. Liang Chen on article 7
(8, 1),  -- alice on article 8
(8, 2),  -- bob on article 8
(9, 3),  -- frank on article 9
(10, 4); -- henry on article 10

-- ============================================================
-- 9. ArticleKeyword
-- ============================================================
INSERT INTO ArticleKeyword (ArticleID, KeywordID) VALUES
(1, 1), (1, 2), (1, 3),         -- article 1: deep learning, NLP, transformer
(2, 4), (2, 5),                  -- article 2: query opt, distributed DB
(3, 1), (3, 2), (3, 3),         -- article 3: deep learning, NLP, transformer
(4, 6), (4, 7),                  -- article 4: RL, robotics
(5, 8), (5, 9),                  -- article 5: federated learning, diff privacy
(6, 10),(6, 11),                 -- article 6: GNN, knowledge graphs
(7, 12),(7, 13),                 -- article 7: containerization, automotive
(8, 14),(8, 15),                 -- article 8: lossless join, normalization
(9, 16),(9, 17),(9, 20),         -- article 9: zero-shot, semantic, CV
(10,18),(10,19);                 -- article 10: microservices, cloud

-- ============================================================
-- 10. Review
-- ============================================================
INSERT INTO Review (ArticleID, ReviewerID, ReviewDate, Comments, Recommendation) VALUES
(1, 1, '2024-02-01', 'Excellent survey with comprehensive coverage. Minor improvements needed in section 3.', 'Accept'),
(1, 2, '2024-02-05', 'Well written. The experimental setup could be more rigorous.',                         'Minor Revision'),
(2, 2, '2024-03-10', 'Strong theoretical contribution. Benchmarks are convincing.',                         'Accept'),
(2, 4, '2024-03-15', 'Good work but comparison with baseline systems needs expansion.',                      'Minor Revision'),
(3, 1, '2024-04-20', 'Comprehensive survey. Recommend adding recent 2024 models.',                          'Minor Revision'),
(4, 3, '2024-05-10', 'Novel approach to robotic control. Results are impressive.',                           'Accept'),
(4, 5, '2024-05-15', 'Sample efficiency claims need more ablation studies.',                                 'Major Revision'),
(5, 1, '2024-06-20', 'Privacy analysis is rigorous. Accuracy tradeoff is well justified.',                  'Accept'),
(7, 2, '2024-08-15', 'Containerization approach is practical. OTA update latency needs discussion.',        'Minor Revision'),
(8, 4, '2024-09-10', 'Formal proofs are correct. Examples help clarify complex concepts.',                  'Accept');

-- ============================================================
-- 11. Citation
-- ============================================================
INSERT INTO Citation (CitingArticleID, CitedArticleID, CitationDate) VALUES
(3, 1, '2024-04-01'),   -- survey cites deep learning paper
(4, 1, '2024-05-01'),   -- RL paper cites deep learning paper
(5, 1, '2024-06-01'),   -- federated learning cites deep learning
(5, 3, '2024-06-01'),   -- federated learning cites transformer survey
(6, 1, '2024-07-01'),   -- GNN paper cites deep learning
(6, 3, '2024-07-01'),   -- GNN paper cites transformer survey
(7, 8, '2024-08-01'),   -- containerization cites lossless join
(9, 1, '2024-10-01'),   -- zero-shot cites deep learning
(9, 3, '2024-10-01'),   -- zero-shot cites transformer survey
(10, 7, '2024-11-01');  -- microservices cites containerization

-- ============================================================
-- 12. FunctionalDependencies  (documentation)
-- ============================================================
INSERT INTO FunctionalDependencies (TableName, Determinant, Dependent, EnforcementMethod, Notes) VALUES
('UserAccount',     'UserID',                  'Username, Email, Role, Affiliation', 'Primary Key',    'Single source of truth for user identity'),
('ResearchArticle', 'ArticleID',               'Title, Abstract, DOI, Status',      'Primary Key',    'Core article attributes'),
('ResearchArticle', 'DOI',                     'ArticleID',                         'Unique Constraint','DOI globally unique'),
('Author',          'AuthorID',                'UserID, Name, Affiliation',         'Primary Key',    'Lossless join: registered uses UserID'),
('Reviewer',        'ReviewerID',              'UserID, Name, ExpertiseArea',       'Primary Key',    'Lossless join: registered uses UserID'),
('Review',          'ArticleID, ReviewerID',   'ReviewDate, Recommendation',        'Unique Constraint','One review per reviewer per article'),
('Citation',        'CitingArticleID, CitedArticleID', 'CitationID',               'Foreign Key',    'No self-citation enforced in application'),
('Keyword',         'KeywordText',             'KeywordID',                         'Unique Constraint','Normalized keyword table'),
('ArticleKeyword',  'ArticleID, KeywordID',    '-',                                 'Primary Key',    'Junction table — partition join'),
('ArticleAuthor',   'ArticleID, AuthorID',     '-',                                 'Primary Key',    'Junction table — lossless join');

-- ============================================================
-- 13. Performance seed (one health snapshot so dashboard works)
-- ============================================================
INSERT INTO PerformanceHealthSnapshots (HealthScore) VALUES (95.0);
