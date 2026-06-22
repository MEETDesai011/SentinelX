// 1. Create Constraints for Node Uniqueness
CREATE CONSTRAINT unique_person_id IF NOT EXISTS
FOR (p:Person) REQUIRE p.id IS UNIQUE;

CREATE CONSTRAINT unique_phone_number IF NOT EXISTS
FOR (ph:PhoneNumber) REQUIRE ph.number IS UNIQUE;

CREATE CONSTRAINT unique_bank_account IF NOT EXISTS
FOR (b:BankAccount) REQUIRE b.id IS UNIQUE;

CREATE CONSTRAINT unique_device_imei IF NOT EXISTS
FOR (d:Device) REQUIRE d.imei IS UNIQUE;

CREATE CONSTRAINT unique_transaction_id IF NOT EXISTS
FOR (t:Transaction) REQUIRE t.id IS UNIQUE;

CREATE CONSTRAINT unique_scam_campaign_id IF NOT EXISTS
FOR (s:ScamCampaign) REQUIRE s.id IS UNIQUE;

// 2. Create Search Indexes
CREATE INDEX index_person_name IF NOT EXISTS
FOR (p:Person) ON (p.name);

CREATE INDEX index_transaction_amount IF NOT EXISTS
FOR (t:Transaction) ON (t.amount);

// 3. Seed Mock Fraud Ring Data (C2C Multi-Hop Mule Chain)
MERGE (c1:Person {id: "P-4401", name: "Rajesh Sharma", role: "VICTIM"})
MERGE (s1:Person {id: "P-8809", name: "Amit Shah (Mule Account Holder)", role: "MULE"})
MERGE (s2:Person {id: "P-8810", name: "Kunal Roy (Mule Account Holder)", role: "MULE"})
MERGE (s3:Person {id: "P-8811", name: "Vikas Dubey (Cash Out Operator)", role: "MULE"})
MERGE (scammer:Person {id: "P-9900", name: "Unknown Extortionist", role: "CRIMINAL"})

MERGE (ph1:PhoneNumber {number: "+919811223344"}) // Victim phone
MERGE (ph2:PhoneNumber {number: "+919876500112"}) // Scammer phone
MERGE (ph3:PhoneNumber {number: "+919998887776"}) // Mule contact phone

MERGE (ba1:BankAccount {id: "BA-SBI-1002", bank: "SBI", balance: 500000})
MERGE (ba2:BankAccount {id: "BA-HDFC-9921", bank: "HDFC", balance: 12000})
MERGE (ba3:BankAccount {id: "BA-ICICI-8812", bank: "ICICI", balance: 2500})
MERGE (ba4:BankAccount {id: "BA-BOB-7761", bank: "BOB", balance: 0})

MERGE (dev1:Device {imei: "IMEI-88772299", model: "OnePlus 11", ip: "192.168.1.43"})
MERGE (dev2:Device {imei: "IMEI-11223344", model: "Redmi Note 12", ip: "103.45.22.99"}) // Scammer device

MERGE (camp:ScamCampaign {id: "CAMP-109", type: "DIGITAL_ARREST", target: "CBI Impersonation"})

// Create Links
MERGE (c1)-[:USES]->(ph1)
MERGE (c1)-[:OWNS]->(ba1)
MERGE (c1)-[:USES]->(dev1)

MERGE (scammer)-[:USES]->(ph2)
MERGE (scammer)-[:USES]->(dev2)
MERGE (scammer)-[:MEMBER_OF]->(camp)

MERGE (s1)-[:OWNS]->(ba2)
MERGE (s2)-[:OWNS]->(ba3)
MERGE (s3)-[:OWNS]->(ba4)

// Scammer calls victim
MERGE (ph2)-[:CALLED {timestamp: "2026-06-22T17:30:00Z", duration_sec: 142}]->(ph1)
MERGE (c1)-[:VICTIM_OF]->(camp)

// Multi-hop Money Flow (1st hop HDFC -> 2nd hop ICICI -> 3rd hop BOB Cash Out)
MERGE (ba1)-[:TRANSFERRED_TO {amount: 250000, timestamp: "2026-06-22T17:35:00Z", txId: "TXN-001"}]->(ba2)
MERGE (ba2)-[:TRANSFERRED_TO {amount: 240000, timestamp: "2026-06-22T17:38:00Z", txId: "TXN-002"}]->(ba3)
MERGE (ba3)-[:TRANSFERRED_TO {amount: 235000, timestamp: "2026-06-22T17:40:00Z", txId: "TXN-003"}]->(ba4)
