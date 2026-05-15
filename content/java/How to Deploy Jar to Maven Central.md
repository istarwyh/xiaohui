---
created: 2024-11-17T20:57:23+08:00
modified: 2025-09-18T09:27:31+08:00
published: 2024-11-17T20:57:23+08:00
---

我们想要把自己的开源库发布到Maven的中央仓库是可以的，但是不能直接上传，需要有中转站类似[central.sonatype.org](https://central.sonatype.org/)，它会在检查核实了该依赖没有问题后，定期自动同步到Maven的中央仓库。上传到 [central.sonatype.org](https://central.sonatype.org/) 还有两种方式：
1. Publishing via the Central Portal
2. Publishing via OSSRH
## 推荐的做法
原本通常的做法就是第二种，第一种其实是2024年才推出的，目前也是推荐的发布方式。官方是希望通过[API](https://central.sonatype.org/publish/publish-portal-api/)，Publishing By Uploading a Bundle[⚓︎](https://central.sonatype.org/publish/publish-portal-upload/#publishing-by-uploading-a-bundle "Permanent link") 。不过当前简单说就是**手动**上传符合他要求的包。之所以是手动，因为 sonatype 那边希望切换原本上传到 OSSRH 的方式到走 [central.sonatype.com](https://central.sonatype.com)发布API的方式，但是新的平台能力目前只建设到了手动上传的地步。
而原有上传到 OSSRH 需要 token,现在想申请还是有点麻烦的，还需要说明你为啥不能用新的方式[^trouble]。
关系就是这样，但是看文档的时候可能会因为很多名词而困惑，这里简单补充几个基本名词：

- [central.sonatype.org](https://central.sonatype.org/)： 面向开源的一个Nexus公共服务
- [Nexus](https://www.sonatype.com/nexus-repository-oss)：一个支持Maven仓库的软件，由Sonatype开发，有免费版和专业版两个版本，很多大公司内部都使用Nexus作为自己的私有Maven仓库。
- OSSRH：Open Source Software Repository Hosting,即开源软件仓库托管
- Central Portal: 指 central.sonatype.com ，既指其网页端，也指其API
- NXRM: Nexus Repository Manager,即 Nexus 仓库管理，原本用于产生访问 OSSRH token的地方
- [`issues.sonatype.org`](https://central.sonatype.org/news/20240109_issues_sonatype_org_deprecation/)： 原本面向用户申请 token的地方，已经被废弃


## 手动发布具体步骤

必须说明，以下步骤是比较愚蠢的，只是能用而已。如果你有更好的，能告诉我吗，不甚感激🧎🧎

1. 切到当前module目录下，执行 `mvn clean deploy` ，因为没有正确的 ossrh token , deploy 会报错，不过会生成几个手动上传需要的文件：
```
junit-extensions-0.0.2-MINOR.jar
junit-extensions-0.0.2-MINOR.jar.md5
junit-extensions-0.0.2-MINOR.jar.sha1
junit-extensions-0.0.2-MINOR-javadoc.jar
junit-extensions-0.0.2-MINOR-javadoc.jar.md5
junit-extensions-0.0.2-MINOR-javadoc.jar.sha1
junit-extensions-0.0.2-MINOR-sources.jar
junit-extensions-0.0.2-MINOR-sources.jar.md5
junit-extensions-0.0.2-MINOR-sources.jar.sha1
```

2. 这里还缺少pom 文件，所以我们要手动从 本地的`.m2` 目录中复制过来: 
```sh
cp /Users/mac/.m2/repository/io/github/istarwyh/junit-extensions/0.0.4-MINOR/junit-extensions-0.0.4-MINOR.pom  /Users/mac/Desktop/code-open/TestMuseum/junit-extensions/target 
```
4. 但是复制过来的pom 文件没有`md5` 和 `sha1` 文件，所以我们再执行一遍 `mvn  deploy` 来生成pom对应`md5` 和 `sha1` 文件, 注意不要 `clean` !
5. 现在target 中的文件就全了，我们需要将它们复制到指定目录,即 `io/github/istarwyh/junit-extensions/0.0.4-MINOR` : ` 
```sh
mkdir -p io/github/istarwyh/junit-extensions/0.0.4-MINOR && cp -p target/*.{jar,sha1,md5,pom} io/github/istarwyh/junit-extensions/0.0.4-MINOR/`
```

6. 接下来切到指定目录`cd io/github/istarwyh/junit-extensions/0.0.4-MINOR/`，对文件进行GPG签名，
```sh
find . $$ -name "*.jar" -or -name "*.pom" $$ -exec gpg -ab {} \;
```
	`$$`有可能不被 terminal 认识，报错了就单个 `"*.jar"` 执行也可以。
7. 签名后成功如果生成`.asc`文件，文件就算准备齐全，然后将 `io` 目录一起压缩打包，通过 https://central.sonatype.com/publishing 上传

[^trouble]:https://central.sonatype.org/register/legacy/