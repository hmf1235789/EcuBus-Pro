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

* 🆓 Open-source and free to use
* 🚀 Modern, intuitive user interface
* 💻 Cross-platform support (Windows, Linux)
* 🔌 Extensive hardware compatibility (PEAK, Kvaser, ZLG, and more)
* 📝 Powerful TypeScript-based scripting engine
* ⌨️ Full-featured command-line interface

### Core Features

For detailed information, please refer to our [User Manual](./docs/um/concept.md).

#### Hardware Support

| Manufacturer | Supported Protocols |
|--------|-------------------|
| PEAK | CAN, CAN-FD, LIN |
| KVASER | CAN, CAN-FD |
| ZLG | CAN, CAN-FD |
| Toomoss | CAN, CAN-FD (Coming Soon) |

#### Software Capabilities

| Feature | Description |
|---------|-------------|
| Platform Support | Windows (installer, portable), Linux (deb package) |
| Diagnostic Protocols | CAN/CAN-FD, DoIP, LIN |
| Scripting | Advanced TypeScript-based automation - [Documentation](./docs/um/script.md) |
| Database Support | LIN LDF (edit & export), CAN DBC (view) - [Details](./docs/um/database.md) |
| Data Visualization | Real-time signal graphing and analysis |

### Feature Highlights

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

- [X] Priority issue resolution
- [X] One-on-one technical consultation
- [X] Custom development support for Security Access (0x27) and Authentication (0x29)

## Contributors

Thanks to all the contributors who have helped shape EcuBus-Pro:

<a href="https://github.com/ecubus/EcuBus-Pro/graphs/contributors"><img src="https://opencollective.com/ecubus/contributors.svg?width=890&amp;button=false"></a>

We welcome contributions! Please review our [contribution guidelines](./.github/contributing.md) before getting started.

## License
Apache-2.0

---

<script setup>
  import 'viewerjs/dist/viewer.css';
import Viewer from 'viewerjs';
import { onMounted,onUnmounted} from 'vue';
onMounted(() => {
  const images = document.querySelectorAll('img[alt="base1"]');
  
   const viewerContainer = document.createElement('div');
   //setup attribute id for viewerContainer
    viewerContainer.setAttribute('id', 'viewerContainer');


  viewerContainer.style.display = 'none';
  document.body.appendChild(viewerContainer);
  //css pointer
  images.forEach(img => img.style.cursor = 'pointer');
  images.forEach(img => viewerContainer.appendChild(img.cloneNode(true)));
  const viewer = new Viewer(viewerContainer, {
    inline: false,
    zoomRatio: 0.1,
  });
  images.forEach((img, index) => {
    img.addEventListener('click', () => {
      viewer.view(index);
    });
  });
});
onUnmounted(() => {
  const viewerContainer = document.getElementById('viewerContainer');
  if (viewerContainer) {
    viewerContainer.remove();
  }
});
</script>


