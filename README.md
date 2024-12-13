<div align="center">
  <a href="https://app.whyengineer.com">
    <img width="160" height="160" src="https://ecubus.oss-cn-chengdu.aliyuncs.com/img/logo256.png">
  </a>

  <h1>EcuBus-Pro</h1>

   <div style="margin:5px; display: flex; justify-content: center; align-items: center;gap:4px">
    <a href="https://github.com/ecubus/EcuBus-Pro/releases">
      <img src="https://github.com/ecubus/EcuBus-Pro/actions/workflows/build.yml/badge.svg" alt="github-ci" />
    </a>
    <a href="https://github.com/ecubus/EcuBus-Pro">
       <img src="https://img.shields.io/github/stars/ecubus/EcuBus-Pro"/>
    </a>
  </div>
  <b style="font-size:16px">A powerful automotive ECU development tool</b><br/>
  <i>Easy of use, Cross platform, Multi dongle, Powerful script ability, CLI support</i><br/>
  Document: <a href="https://app.whyengineer.com">https://app.whyengineer.com</a>
</div>

## Introduction

`CAN-OE` is the best tool, but it's expensive. We still need another tool to develop our ECU code. EcuBus-Pro is a powerful automotive ECU development tool, it contains the following features:
* open source and free
* easy of use
* cross platform
* add multi USB dongle (PEAK, Kvaser, ZLG, etc)  
* powerful script ability, based on typescript
* CLI ability support

### GUI Snapshot

![base1](./docs/about/base1.gif)
---
![base1](./docs/about/uds.gif)

### Script Ability

Script Engine is based on `nodejs`, you can use almost all nodejs functions in your script, Also, we provide  a lot of APIs to interact with EcuBus-Pro, such as:
![cli](./docs/um/script1.gif)

### CLI Ability

run uds sequence by cli
![cli](./docs/about/seq.png)


## Support this project

Support this project by [becoming a sponsor](./docs/about/sponsor). Your logo will show up here with a link to your website. 🙏

### Technical support

You can also consider sponsoring us to get extra technical support services. If you do, you can get access to the [ecubus/technical-support](https://github.com/ecubus/technical-support) repository, which has the following benefits:

- [X] Handling Issues with higher priority
- [X] One-to-one technical consulting service
- [X] Help to write addon code to access 0x27,0x29 dll functions

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


