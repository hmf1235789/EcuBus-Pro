<div align="center">
  <a href="https://app.whyengineer.com">
    <img width="160" height="160" src="https://ecubus.oss-cn-chengdu.aliyuncs.com/img/logo256.png">
  </a>

  <h1>EcuBus-Pro</h1>

   <div style="margin:5px; display: flex; justify-content: center; align-items: center;gap:4px">
    <a href="https://github.com/ecubus/EcuBus-Pro/releases">
      <img src="https://github.com/ecubus/EcuBus-Pro/actions/workflows/build.yml/badge.svg" alt="github-ci" />
    </a>
    <a href="https://github.com/ecubus/EcuBus-Pro/releases">
      <img src="https://github.com/ecubus/EcuBus-Pro/actions/workflows/build-linux.yml/badge.svg" alt="github-ci" />
    </a>
    <a href="https://github.com/ecubus/EcuBus-Pro">
       <img src="https://img.shields.io/github/stars/ecubus/EcuBus-Pro"/>
    </a>
  </div>
  <b style="font-size:16px">A powerful automotive ECU development tool</b><br/>
  <i>Easy of use, Cross platform, Multi dongle, Powerful script ability, CLI support</i><br/>
  Document: <a href="https://app.whyengineer.com">https://app.whyengineer.com</a>
</div>

## Overview

EcuBus-Pro is an open-source alternative to commercial automotive diagnostic tools like `CAN-OE`. It provides a comprehensive solution for ECU development and testing with:

- 🆓 Open-source and free to use
- 🚀 Modern, intuitive user interface
- 💻 Cross-platform support (Windows, Linux) - [Install](./docs/about/install.md)
- 🔌 Multi-hardware support
  - 🔧 **PEAK**: CAN, CAN-FD, LIN
  - 🔧 **KVASER**: CAN, CAN-FD
  - 🔧 **ZLG**: CAN, CAN-FD
  - 🔧 **Toomoss**: CAN, CAN-FD
- 🛠️ Comprehensive diagnostic capabilities
  - 🔄 **Diagnostic Protocols**: CAN/CAN-FD, DoIP, LIN
- 📝 **Scripting**: Advanced TypeScript-based automation - [Details](./docs/um/script.md)
- 🧪 **Test**: HIL Test Framework - [Details](./docs/um/test/test.md)
- 📊 **Database Support**: LIN LDF (edit & export), CAN DBC (view) - [Details](./docs/um/database.md)
- 📈 **Data Visualization**: Real-time signal graphing and analysis - [Details](./docs/um/graph/graph.md)
- ⌨️ **Command Line**: Full-featured CLI for automation and integration - [Details](./docs/um/cli.md)

For detailed information, please refer to our [User Manual](https://app.whyengineer.com/docs/um/concept.md).

## Feature Highlights

#### CAN Communication

![base1](./docs/about/base1.gif)

#### UDS Diagnostics

![base1](./docs/about/uds.gif)

#### Signal Analysis

![base1](./docs/about/graph.gif)

### Scripting Engine

Built on Node.js, our scripting engine enables:

- Full access to Node.js ecosystem
- Comprehensive EcuBus-Pro API integration
- Advanced test automation capabilities

![base1](./docs/um/script1.gif)

### Command Line Interface

Streamline your workflow with powerful CLI support:
![base1](./docs/about/seq.png)

## Support & Sponsorship

Consider [becoming a sponsor](./docs/about/sponsor) to support ongoing development. Sponsors receive prominent logo placement with website links. 🙏

### Professional Support

We offer premium technical support for sponsors, including access to the private [ecubus/technical-support](https://github.com/ecubus/technical-support) repository with these benefits:

- [x] Priority issue resolution
- [x] One-on-one technical consultation
- [x] Custom development support for Security Access (0x27) and Authentication (0x29)

## Contributors

Thanks to all the contributors who have helped shape EcuBus-Pro:

<a href="https://github.com/ecubus/EcuBus-Pro/graphs/contributors"><img src="https://opencollective.com/ecubus/contributors.svg?width=890&amp;button=false"></a>

We welcome contributions! Please review our [contribution guidelines](./.github/contributing.md) before getting started.

## License

Apache-2.0
