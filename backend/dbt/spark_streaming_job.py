from pyspark.sql import SparkSession
from pyspark.sql.functions import (
    col, window, current_timestamp,
    lit, from_json, to_timestamp
)
from pyspark.sql.types import (
    StructType, StructField, StringType,
    IntegerType, TimestampType
)
import time

MYSQL_URL = "jdbc:mysql://127.0.0.1:3306/research_article_management"
MYSQL_JAR = "C:/spark-jars/mysql-connector-j-8.0.33.jar"

spark = SparkSession.builder \
    .appName("ResearchArticleStreamingStats") \
    .master("local[*]") \
    .config("spark.jars", MYSQL_JAR) \
    .config("spark.sql.streaming.checkpointLocation", "C:/spark-checkpoints") \
    .getOrCreate()

spark.sparkContext.setLogLevel("WARN")

# ── Source: rate stream simulates article submission events ──────────────
# Each row = one simulated article submission event
# 'value' cycles 0-9 → mapped to PublicationType
raw_stream = spark.readStream \
    .format("rate") \
    .option("rowsPerSecond", 2) \
    .load()

# Map numeric value to PublicationType and add event timestamp
from pyspark.sql.functions import when

events = raw_stream.withColumn(
    "PublicationType",
    when(col("value") % 2 == 0, "Journal").otherwise("Conference")
).withColumn(
    "EventTime", col("timestamp")
)

# ── Transformation: 30-second tumbling window count per PublicationType ──
windowed_counts = events \
    .withWatermark("EventTime", "10 seconds") \
    .groupBy(
        window(col("EventTime"), "30 seconds"),
        col("PublicationType")
    ) \
    .count() \
    .select(
        lit(0).alias("BatchID"),          # overwritten in foreachBatch
        col("window.start").alias("WindowStart"),
        col("window.end").alias("WindowEnd"),
        col("PublicationType"),
        col("count").alias("SubmissionCount")
    )

# ── Sink: write each micro-batch to MySQL via JDBC ───────────────────────
batch_counter = {"id": 0}

def write_to_mysql(batch_df, batch_id):
    if batch_df.count() == 0:
        return

    # Tag each row with the actual batch ID
    tagged = batch_df.withColumn("BatchID", lit(batch_id))

    jdbc_props = {
        "user": "root",
        "password": "root",
        "driver": "com.mysql.cj.jdbc.Driver"
    }

    tagged.write \
        .jdbc(
            url=MYSQL_URL,
            table="StreamingStats",
            mode="append",
            properties=jdbc_props
        )

    print(f"Batch {batch_id} written — {tagged.count()} rows")

# ── Start the streaming query ────────────────────────────────────────────
query = windowed_counts.writeStream \
    .outputMode("update") \
    .foreachBatch(write_to_mysql) \
    .trigger(processingTime="15 seconds") \
    .start()

print("Spark Structured Streaming started. Writing to MySQL every 15 seconds...")
print("Query Ctrl+C to stop.\n")

query.awaitTermination()