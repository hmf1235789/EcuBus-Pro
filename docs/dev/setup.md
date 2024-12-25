# Setup

## Prerequisites

- Node.js (v20 or higher)
- npm
- Node-gyp

## Installation Steps

```bash
git clone https://github.com/ecubus/EcuBus-Pro.git
```

```bash
cd EcuBus-Pro
```

```bash
npm install
```

`build native module`
```bash
cd src/main/docan
npx node-gyp rebuild
cd ../..

cd src/main/dolin
npx node-gyp rebuild
cd ../.. 
```

`run`

```bash
npm run dev
```

`build`

```bash
npm run build:win
```


## Get From Github Action

you also can get detail setup steps from [Github Action](https://github.com/ecubus/EcuBus-Pro/tree/master/.github/workflows)