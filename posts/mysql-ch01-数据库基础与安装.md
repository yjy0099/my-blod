---
title: MySQL 笔记 · 第 1 章：数据库基础与安装
date: 2026-09-21
category: MySQL 数据库
tags: [MySQL, 数据库, 学习笔记, 面试题, SQL, 安装配置]
summary: 从「数据库是什么」讲到 MySQL 装起来：数据三大类与 RDBMS/NoSQL 的分工、五种主流关系型数据库、Windows 下 my.ini 配置与 initialize 初始化、数据库的组成部分、SQL 的四大分类与标识符规范，附 10 道高频面试题。
---

## 一、必须记住的知识点

### 1. 数据库是什么

数据库（Database）就是**存储数据的仓库**，本质上是一个容器。它解决的是「数据怎么有序地存、快速地取、安全地管」这三个问题。

网络中的数据按结构程度分为三大类：

| 数据类型 | 含义 | 典型例子 |
| --- | --- | --- |
| 结构化数据 | 有固定格式、能用二维表表示 | 用户表、订单表 |
| 半结构化数据 | 有一定结构但不固定 | JSON、XML、日志 |
| 非结构化数据 | 没有固定结构 | 图片、音频、视频、文档 |

> 关键结论：**在 Web 应用系统中，主要处理的是结构化数据**，这也是关系型数据库存在的主战场。

### 2. 数据库的两大分类

- **关系型数据库 RDBMS**：主要存储**结构化数据**，用二维表组织数据，靠 SQL 操作。
- **非关系型数据库 NoSQL**（Not Only SQL）：主要存储**半结构化、非结构化数据**，如 Redis（键值）、MongoDB（文档）、HBase（列族）。

选择上有个朴素的原则：**数据之间有明确关系、需要事务保证的，用关系型；追求高并发读写、结构灵活、可牺牲强一致的，用 NoSQL**。

### 3. 主流关系型数据库

| 数据库 | 特点 | 常见应用场景 |
| --- | --- | --- |
| MySQL | 开源免费、支持商用 | 互联网项目首选 |
| Oracle | 甲骨文公司、商业收费 | 银行、政府项目 |
| SQL Server | 微软旗下 | `.NET` 技术栈、医疗系统 |
| PostgreSQL | 功能强、近几年风头正盛 | 有替代 MySQL 的趋势 |
| DB2 | IBM 旗下 | IBM 相关业务 |

### 4. MySQL 的下载与安装（Windows 压缩包方式）

官网 `https://www.mysql.com`，下载页 `https://dev.mysql.com/downloads/mysql/`。

安装步骤：

1. 在存放应用程序的目录下新建 `MySQL` 文件夹；
2. 把下载的压缩包中 **`bin` 所在目录的所有内容**解压进去；
3. 在 `MySQL` 文件夹下新建核心配置文件 `my.ini`：

```ini
[mysqld]
# 数据库安装目录
basedir=D:\\Program Files\\MySQL
# 数据存储目录
datadir=D:\\Program Files\\MySQL\\data
# 端口号，默认 3306
port=3306
# 错误日志（不是必须的）
log-error=D:\\Program Files\\MySQL\\logs\\error.log
```

4. **以管理员身份**打开命令提示符，初始化数据库：

```bash
# 切换到 bin 目录
cd /d D:\Program Files\MySQL\bin

# 初始化（可能等待一段时间）
mysqld --initialize-insecure --user=mysql
```

> `--initialize` 会创建一个带**随机过期密码**的超级用户，密码写进日志；`--initialize-insecure` 创建**空密码**的超级用户。学习阶段常用后者，生产环境请用前者并及时改密。

5. 把 MySQL 注册为开机自启服务：

```bash
# 服务名默认叫 mysql
mysqld install <服务名称>
```

6. （可选）把 `bin` 目录加入环境变量 `Path`，方便任意目录使用；
7. 启动服务：

```bash
net start <服务名称>
```

### 5. 验证是否安装成功

```sql
-- -u 账号，默认超级管理员 root
-- -p 密码，默认没有密码
-- -h 主机，默认 localhost
-- -P 端口，默认 3306
mysql -uroot -P3306 -p
```

### 6. 卸载 MySQL

1. 停止服务：`net stop <服务名称>`（管理员模式）
2. 卸载自启服务：`mysqld remove <服务名>`
3. 删除环境变量 `Path` 中的配置（没配过可跳过）
4. 删除 `MySQL` 文件夹

### 7. 图形化客户端

纯命令行维护成本高，实际开发常用 **Navicat**、**SQLyog** 等客户端。它们只是「更好用的操作界面」，**底层执行的都是 SQL**。

### 8. 数据库的组成

一个 MySQL 数据库管理系统包含三部分：**database（数据库）、存储引擎、事务管理**。

其中 database 又由 6 大部分组成：**table（表）、view（视图）、index（索引）、procedure（存储过程）、function（函数）、trigger（触发器）**。

> 记忆：**MySQL 是关系型数据库，善于处理结构化数据，主要通过结构化查询语言（SQL）对数据进行处理。**

### 9. SQL 注释

- 单行注释：`-- `（注意后面要跟空格）或 `# `
- 多行注释：`/* ... */`

### 10. 标识符规则

- 由**字母、数字、下划线、美元符号**组成，**不能以数字开头**，不能使用数据库关键字；
- **库名、表名**：Linux 下**大小写敏感**，Windows 下不敏感；
- **列名、索引名、存储过程名**：所有平台都**不敏感**；
- 为了跨平台可移植，建议**统一小写**，多个单词用 `_` 分隔（蛇形命名）。

### 11. SQL 的四大分类

| 分类 | 全称 | 作用 | 主要命令 |
| --- | --- | --- | --- |
| DDL | 数据定义语言 | 定义库/表结构 | `create`、`drop`、`truncate`、`show`、`alter` |
| DML | 数据操纵语言 | 增删改表里的数据 | `insert`、`update`、`delete` |
| DQL | 数据查询语言 | 查询数据 | `select` |
| DCL | 数据控制语言 | 权限控制 | `grant`、`revoke` |

> 注意一个易混点：**`truncate` 属于 DDL，而 `delete` 属于 DML**。这是后面「delete 与 truncate 区别」的根因。

## 二、常用命令速查

```sql
-- 连接数据库
mysql -uroot -P3306 -p

-- 查看版本
select version();

-- 查看当前登录用户
select user();

-- 查看当前时间
select now();
```

```bash
# 服务控制
net start mysql     # 启动
net stop  mysql     # 停止
mysqld  install mysql   # 注册为服务
mysqld  remove  mysql   # 卸载服务
```

## 三、高频面试题（附答案）

**Q1：关系型数据库和非关系型数据库的区别？**

关系型（MySQL、Oracle）用二维表存**结构化数据**，支持 SQL、支持事务的 ACID、有强一致性；非关系型（Redis、MongoDB）存**半结构化/非结构化数据**，结构灵活、易水平扩展、高并发读写强，但通常牺牲强一致性与复杂关联查询能力。

**Q2：为什么 Web 项目大多选 MySQL？**

开源免费可商用、生态成熟（驱动、ORM、运维工具齐全）、性能足以支撑绝大多数互联网场景、社区活跃，且有大量成熟的读写分离/分库分表方案。

**Q3：`--initialize` 和 `--initialize-insecure` 有什么区别？**

前者创建**随机且已过期**的 root 密码并存进错误日志，必须查日志取密码；后者创建**空密码**的 root，登录后需立即改密。生产环境用前者。

**Q4：MySQL 默认端口是多少？可以改吗？**

默认 **3306**，可在 `my.ini` 的 `port=` 修改。改了之后连接时必须用 `-P` 指定新端口。

**Q5：DDL、DML、DQL、DCL 分别包含哪些命令？**

DDL：`create/drop/truncate/show/alter`；DML：`insert/update/delete`；DQL：`select`；DCL：`grant/revoke`。面试常考「`truncate` 属于哪一类」——它属于 **DDL**。

**Q6：库名、表名、列名的大小写敏感规则？**

库名和表名在 **Linux 敏感、Windows 不敏感**（由 `lower_case_table_names` 参数控制，默认跟随操作系统）；列名、索引名、存储过程名**在所有平台都不敏感**。为可移植性，建议全小写加下划线。

**Q7：为什么安装时要单独写 `my.ini`？**

`my.ini` 是 MySQL 的核心配置文件，用来指定安装目录、数据目录、端口、日志路径、字符集、存储引擎等。不写它 MySQL 会用默认值，数据目录可能落到系统盘，不利于管理和迁移。

**Q8：`mysqld` 和 `mysql` 有什么区别？**

`mysqld` 是**数据库服务端进程**（daemon），负责真正存储和处理数据；`mysql` 是**命令行客户端**，只负责把 SQL 发给服务端并展示结果。一个是「引擎」，一个是「方向盘」。

**Q9：一个 MySQL 数据库管理系统由哪几部分组成？**

三部分：**database（数据库）、存储引擎、事务管理**。其中 database 又包含 table、view、index、procedure、function、trigger 六大对象。

**Q10：MySQL 8.0 相比 5.7 有哪些主要变化？**

| 方面 | 5.7 | 8.0 |
| --- | --- | --- |
| 默认认证插件 | `mysql_native_password` | `caching_sha2_password`（更安全，老驱动可能连不上） |
| 默认字符集 | `latin1`（可按版本） | **`utf8mb4`** |
| 窗口函数 | 不支持 | **支持** `rank()`/`row_number()` 等 |
| CTE / 递归查询 | 不支持 | **支持 `with` / `with recursive`** |
| 隐藏索引 | 不支持 | 支持 `invisible index`，可先隐藏再删 |
| JSON | 支持 | 增强（`->>`、`json_table`） |
| 数据字典 | 文件存储 | 事务化的数据字典，DDL 更原子 |

最需要注意的是**认证插件的变化**：升级到 8.0 后，旧版客户端/驱动可能报认证错误，需要升级驱动或把用户改成 `mysql_native_password`。

## 四、易错点

1. **`--initialize` 后直接空密码登录失败**：它生成的是随机过期密码，必须去错误日志里找，别慌。
2. **`--` 注释后面必须跟空格**：写 `--注释` 会报语法错误，正确是 `-- 注释`。
3. **`my.ini` 里路径用反斜杠**：Windows 路径要写成 `D:\\Program Files\\MySQL`（转义），否则 `\P` 会被当转义符。
4. **服务名不是固定的 `mysql`**：`mysqld install` 时自定义了名字，后面 `net start` 必须用同一名字。
5. **`truncate` 归 DDL 不是 DML**：直接影响它「不能回滚、不能带条件」两个行为。
6. **`mysql` 命令必须在 `bin` 目录或已配环境变量**：否则提示「不是内部或外部命令」。
7. **端口被占用**：3306 被别的程序占了会启动失败，改 `my.ini` 的 `port` 或释放占用。
8. **卸载不彻底**：只删文件夹不 `mysqld remove` 服务、不清环境变量，重装容易冲突。
