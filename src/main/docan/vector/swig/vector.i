%module vector

// %typemap(typescript) unsigned int "number";
// %napi_export(XLportHandle);
// %napi_export(xlOpenDriver);
// %napi_export(xlGetDriverConfig);
// %napi_export(xlCloseDriver);
// %napi_export(xlGetChannelMask);
// %node_export(swig_export, 1);

%header %{
#include <windows.h>
#include <winnt.h>
#include <stdlib.h>
#include "vxlapi.h"
#include <napi.h>
%}


%wrapper %{

%}

%include <windows.i>
%include <stdint.i>
%include <carrays.i>
%include <cpointer.i>
%include <vxlapi.h>

// typedef XL_CAN_EV_TAG_TX_MSG xl_can_ev_tag_tx_msg;
// typedef long XLportHandle;
// typedef XL_DRIVER_CONFIG XLdriverConfig;
// typedef XL_CHANNEL_CONFIG XLchannelConfig;
// typedef XLuint64 XLaccess;
// typedef XLlinStatPar XLlinStatPar;

%pointer_class(unsigned int, UINT32)
%pointer_class(XLportHandle, XLPORTHANDLE)
%pointer_class(XLaccess, XLACCESS)
// %pointer_class(XLcanFdConf, XLCANFDCONF);

%array_class(XLchannelConfig, CHANNEL_CONFIG);
%array_class(XLstatus, xlstatus);
// %array_class(XLcanFdConf, XLCANFDCONF);

%inline %{
void LoadDll(const char* path) {
  SetDllDirectory(path);
}

// const char* xlCanGetEventString(XLevent* event) {
//   return ::xlCanGetEventString(event);
// }

// XLstatus xlOpenDriver() {
//   return ::xlOpenDriver();
// }

%}


%init %{

extern void CreateTSFN(const Napi::CallbackInfo &info);
extern void FreeTSFN(const Napi::CallbackInfo &info);


do {
  Napi::PropertyDescriptor pd = Napi::PropertyDescriptor::Function("CreateTSFN", CreateTSFN);
  NAPI_CHECK_MAYBE(exports.DefineProperties({
    pd
  }));
} while (0);

do {
  Napi::PropertyDescriptor pd = Napi::PropertyDescriptor::Function("FreeTSFN", FreeTSFN);
  NAPI_CHECK_MAYBE(exports.DefineProperties({
	pd
  }));
} while (0);

%}

