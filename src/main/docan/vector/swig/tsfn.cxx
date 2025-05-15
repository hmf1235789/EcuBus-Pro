#include "vxlapi.h"
#include "napi.h"
#include <chrono>
#include <thread>
#include <windows.h>
#include <map>
#include <cstring>


struct TsfnContext {
  std::thread nativeThread;  
  bool closed;                  
  Napi::ThreadSafeFunction tsfn;  
  Napi::ThreadSafeFunction tsfnfd; 
   Napi::ThreadSafeFunction tserror; 
//  CHANNEL_HANDLE channel;
  
};

std::map<std::string, TsfnContext *> tsfnContextMap;

void threadEntry(TsfnContext *context);

void FinalizerCallback(Napi::Env env, void *finalizeData, TsfnContext *context);

void CreateTSFN(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  uint32_t a0=info[0].As<Napi::Number>().Uint32Value(); 
  uint32_t a1=info[1].As<Napi::Number>().Uint32Value();
  // CHANNEL_HANDLE handle = (CHANNEL_HANDLE)(((uint64_t)a1<<32)|a0);
  Napi::String name = info[2].As<Napi::String>();  
  Napi::String nameFd = info[3].As<Napi::String>();

  auto testData = new TsfnContext();
  testData->closed=false;
  // testData->channel = handle;

   testData->tsfn = Napi::ThreadSafeFunction::New(
      env,                       
      info[4].As<Napi::Function>(), 
      name.Utf8Value().data(),     
      1,                           
      1,                          
      testData             
    
  );
  testData->tsfnfd = Napi::ThreadSafeFunction::New(
      env,                     
      info[5].As<Napi::Function>(), 
      nameFd.Utf8Value().data(),    
      1,                          
      1,                     
      testData                 
  );
  Napi::String nameError = info[6].As<Napi::String>();
  testData->tserror = Napi::ThreadSafeFunction::New(
      env,                       
      info[7].As<Napi::Function>(), 
      nameError.Utf8Value().data(),  
      1,                          
      1,                      
      testData         
  );

  testData->nativeThread = std::thread(threadEntry, testData);

  tsfnContextMap[name.Utf8Value()] = testData;
}

void FreeTSFN(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  Napi::String name = info[0].As<Napi::String>();
  auto it = tsfnContextMap.find(name.Utf8Value());  
  if (it != tsfnContextMap.end()) {
    TsfnContext *context = it->second;
    context->closed=true;   
    context->nativeThread.join();

    context->tsfn.Release();     
    context->tsfnfd.Release();
    context->tserror.Release();

    delete context;      
    tsfnContextMap.erase(it);
  }
}

void threadEntry(TsfnContext *context) {
  auto callback = []( Napi::Env env, Napi::Function jsCallback, UINT* value ) {
      jsCallback.Call( {Napi::Number::New( env, *value )} );

      delete value;
  };

  UINT numCan=0;
  UINT numCanFd=0;
  UINT ret=0;
  while (!context->closed) { 
    if(numCan>0){
      UINT* numCanPtr = new UINT;
      *numCanPtr=1;
      context->tsfn.BlockingCall(numCanPtr,callback); 
    }
   
    if(numCanFd>0){
      UINT* numCanFdPtr = new UINT;
      *numCanFdPtr=1;
      context->tsfnfd.BlockingCall(numCanFdPtr,callback);
    }

    ret=0;
    if(ret!=0){
      UINT* retPtr = new UINT;
      *retPtr=ret;
      context->tserror.BlockingCall(retPtr,callback);   
    }
      
      // ZCAN_StartCAN(context->channel);
    //delay 100us
    // std::this_thread::sleep_for(std::chrono::microseconds(100));
  }
}
