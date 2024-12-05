

# doip-custom-simulation
`doip-custom-simulation` is a custom simulation for DOIP protocol, which work as entity. Get more detail information from [https://github.com/doip/doip-custom-simulation](https://github.com/doip/doip-custom-simulation)

## Install

```bash
git clone https://github.com/doip/doip-custom-simulation.git
```

## Build
```
cd doip-custom-simulation

.\gradlew.bat build
```
> [!TIP]
> Using aliyun mirror if you download gradle too slow,
> edit gradle/wrapper/gradle-wrapper.properties file
> update `distributionUrl` to `https\://mirrors.aliyun.com/macports/distfiles/gradle//gradle-8.1.1-bin.zip`

![alt text](doip-custom-simulation/image.png)

##  Generate dist
```
.\gradlew.bat installDist
```

## Run
*.properties file is the configuration file, you can modify it to change the configuration.
```
cd build\install\doip-custom-simulation

java "-Dlog4j.configurationFile=log4j2.xml" -jar libs/doip-custom-simulation-2.0.0.jar gateway.properties
```