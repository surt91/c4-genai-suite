# Migrate from rag-server to REIS

The rag-server api offers a `dump` endpoint, which dumps the content of the configured
vectorstore. Note that this endpoint is only available for versions >= 1.0.0 and <=2.4.4.

REIS offers an `import` endpoint, which adds the dump to its vector store.
Note that the embedding will be recalculated on import.

In theory, the following two example calls to curl should be enough to migrate the data from
the rag-server to REIS.
Note that every index must be dumped separately, if you use multiple indexes
(look it up in the web interface of Azure AI Search or your pgvector database if unsure).

If you import the same data twice, the entries in the vector store should be updated instead of duplicated.
Also note there is no undo button for the import.

For example, a migration can be performed with these calls to the endpoints. Ensure that you use the correct hostnames and index names.

```bash
curl http://rag:3200/files/dump?indexName=rag-server-index > dump.json
curl -X POST --data "@dump.json" -H 'Content-Type: application/json' http://reis:3201/files/import?indexName=reis-index
```

After the import, the endpoint of the bucket configuration can be switched in the admin menu of Gaible under Files > Bucket.

## Known problems

* It seems that for pgvector the `indexName` (e.g. `reis-index`) can not be updated if it was first imported with, e.g., a typo.
  In the presumably very rare case that it is needed, there are some solution strategies depending on the content of the database before the import:
  * if pgvector was never used for REIS before: drop the `langchain_pg_embedding` table.
  * if the `indexName` with the typo did not exist before: remove all entries of `langchain_pg_embedding` with the wrong value in the column `collection_id`
  * otherwise, you might have to parse the dump for all ids and delete those from `langchain_pg_embedding`
