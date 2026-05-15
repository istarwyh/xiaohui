---
created: 2024-11-17T20:57:23+08:00
modified: 2025-09-18T09:27:31+08:00
published: 2024-11-17T20:57:23+08:00
---

Optimized Row Columnar (ORC) is a self-describing, type-aware columnar file format designed for Hadoop workloads. It is optimized for large streaming reads, but with integrated support for finding required rows quickly. Storing data in a columnar format lets you achieve high compression rates, which saves storage space and allows for better use of I/O when accessing the data [spark.apache.org](https://spark.apache.org/docs/latest/sql-data-sources-orc.html).

ORC files contain groups of row data called stripes, along with auxiliary information in a file footer. At the end of the file a postscript holds compression parameters and the size of the compressed footer [spark.apache.org](https://spark.apache.org/docs/latest/sql-data-sources-orc.html).

The ORC format supports multiple compression modes, including none, zlib, snappy, and lzo. It also supports complex types: structs, arrays, maps, and unions. The columnar format is also designed to work well with vectorized execution, like Apache Arrow [spark.apache.org](https://spark.apache.org/docs/latest/sql-data-sources-orc.html).