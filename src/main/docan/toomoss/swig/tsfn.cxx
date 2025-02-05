#include "usb2can.h"
#include "usb2canfd.h"
#include "napi.h"
#include <chrono>
#include <thread>
#include <windows.h>
#include <map>
#include <cstring>

// Data structure representing our thread-safe function context.
struct TsfnContext {
  // Native thread
  std::thread nativeThread;
  bool closed;
  bool isCanFd;
  Napi::ThreadSafeFunction tsfn;
  Napi::ThreadSafeFunction tserror;
  int DevHandle;
  uint8_t CanIndex;
  CAN_MSG canMsg;
  CANFD_MSG canfdMsg;
  // 添加状态数据存储
  union {
    CAN_STATUS canStatus;
    CANFD_BUS_ERROR canfdError;
  } statusData;
};

//a std::map store the tsfn context
std::map<std::string, TsfnContext *> tsfnContextMap;

// The thread entry point. This takes as its arguments the specific
// threadsafe-function context created inside the main thread.
void threadEntry(TsfnContext *context);

// The thread-safe function finalizer callback. This callback executes
// at destruction of thread-safe function, taking as arguments the finalizer
// data and threadsafe-function context.
void FinalizerCallback(Napi::Env env, void *finalizeData, TsfnContext *context);

// Exported JavaScript function. Creates the thread-safe function and native
// thread. Promise is resolved in the thread-safe function's finalizer.
void CreateTSFN(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  int DevHandle=info[0].As<Napi::Number>().Uint32Value();
  uint8_t CanIndex=info[1].As<Napi::Number>().Uint32Value();
  bool isCanFd=info[2].As<Napi::Boolean>().Value();
  Napi::String name = info[3].As<Napi::String>();
  // Construct context data
  auto testData = new TsfnContext();
  testData->closed=false;
  testData->DevHandle = DevHandle;
  testData->CanIndex = CanIndex;
  testData->isCanFd = isCanFd;
  // Create a new ThreadSafeFunction.
  
   testData->tsfn = Napi::ThreadSafeFunction::New(
      env,                          // Environment
      info[4].As<Napi::Function>(), // JS function from caller
      name.Utf8Value().data(),      // Resource name
      1,                            // Max queue size (0 = unlimited).
      1,                            // Initial thread count
      testData                     // Context,
    
  );
  Napi::String nameError = info[5].As<Napi::String>();
  testData->tserror = Napi::ThreadSafeFunction::New(
      env,                          // Environment
      info[6].As<Napi::Function>(), // JS function from caller
      nameError.Utf8Value().data(),      // Resource name
      1,                            // Max queue size (0 = unlimited).
      1,                            // Initial thread count
      testData                     // Context
  );

  testData->nativeThread = std::thread(threadEntry, testData);
  //store by name
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
    context->tserror.Release();

    delete context;
    tsfnContextMap.erase(it);
  }
}

// The thread entry point. This takes as its arguments the specific
// threadsafe-function context created inside the main thread.
void threadEntry(TsfnContext *context) {
  // 处理普通CAN消息的回调
  auto callback = []( Napi::Env env, Napi::Function jsCallback, CAN_MSG* value ) {
    // 创建返回对象
    Napi::Object msgObj = Napi::Object::New(env);
    
    // 设置基本属性
    msgObj.Set("ID", Napi::Number::New(env, value->ID));
    msgObj.Set("TimeStamp", Napi::Number::New(env, value->TimeStamp));
    msgObj.Set("RemoteFlag", Napi::Number::New(env, value->RemoteFlag));
    msgObj.Set("ExternFlag", Napi::Number::New(env, value->ExternFlag));
    msgObj.Set("DataLen", Napi::Number::New(env, value->DataLen));
    msgObj.Set("TimeStampHigh", Napi::Number::New(env, value->TimeStampHigh));
    
    // 创建数据Buffer
    Napi::Buffer<unsigned char> dataBuffer = Napi::Buffer<unsigned char>::Copy(env, 
                                                                             value->Data,
                                                                             value->DataLen);
    msgObj.Set("Data", dataBuffer);

    // 调用JavaScript回调函数
    jsCallback.Call( {msgObj} );
  };

  // 处理CANFD消息的回调
  auto callbackFd = []( Napi::Env env, Napi::Function jsCallback, CANFD_MSG* value ) {
    // 创建返回对象
    Napi::Object msgObj = Napi::Object::New(env);
    
    // 设置基本属性
    msgObj.Set("ID", Napi::Number::New(env, value->ID));
    msgObj.Set("DLC", Napi::Number::New(env, value->DLC));
    msgObj.Set("Flags", Napi::Number::New(env, value->Flags));
    msgObj.Set("TimeStamp", Napi::Number::New(env, value->TimeStamp));
    msgObj.Set("TimeStampHigh", Napi::Number::New(env, value->TimeStampHigh));
    
    // 计算实际数据长度(DLC到字节数的转换)
    unsigned char actualLen = 0;
    if(value->DLC <= 8) {
      actualLen = value->DLC;
    } else if(value->DLC == 9) {
      actualLen = 12;
    } else if(value->DLC == 10) {
      actualLen = 16;
    } else if(value->DLC == 11) {
      actualLen = 20;
    } else if(value->DLC == 12) {
      actualLen = 24;
    } else if(value->DLC == 13) {
      actualLen = 32;
    } else if(value->DLC == 14) {
      actualLen = 48;
    } else if(value->DLC == 15) {
      actualLen = 64;
    }

    // 创建数据Buffer
    Napi::Buffer<unsigned char> dataBuffer = Napi::Buffer<unsigned char>::Copy(env,
                                                                             value->Data,
                                                                             actualLen);
    msgObj.Set("Data", dataBuffer);

    // 调用JavaScript回调函数
    jsCallback.Call( {msgObj} );
  };
  
  // 添加状态回调处理
  auto statusCallback = []( Napi::Env env, Napi::Function jsCallback, void* value ) {
    Napi::Object statusObj = Napi::Object::New(env);
    
    if(!value) {
      jsCallback.Call( {env.Null()} );
      return;
    }

    // 获取上下文
    TsfnContext* context = (TsfnContext*)value;

    if(context->isCanFd) {
      // CANFD总线错误信息
      CANFD_BUS_ERROR* busError = (CANFD_BUS_ERROR*)&context->statusData;
      statusObj.Set("type", Napi::String::New(env, "CANFD_BUS_ERROR"));
      statusObj.Set("TEC", Napi::Number::New(env, busError->TEC));
      statusObj.Set("REC", Napi::Number::New(env, busError->REC));
      statusObj.Set("Flags", Napi::Number::New(env, busError->Flags));
    } else {
      // 普通CAN状态信息
      CAN_STATUS* canStatus = (CAN_STATUS*)&context->statusData;
      statusObj.Set("type", Napi::String::New(env, "CAN_STATUS")); 
      statusObj.Set("TSR", Napi::Number::New(env, canStatus->TSR));
      statusObj.Set("ESR", Napi::Number::New(env, canStatus->ESR));
      statusObj.Set("RECounter", Napi::Number::New(env, canStatus->RECounter));
      statusObj.Set("TECounter", Napi::Number::New(env, canStatus->TECounter));
      statusObj.Set("LECode", Napi::Number::New(env, canStatus->LECode));
      statusObj.Set("ErrFlag", Napi::Number::New(env, canStatus->ErrFlag));
    }

    jsCallback.Call( {statusObj} );
  };
  
  int ret=0;
  unsigned int statusCheckCounter = 0; // 状态检查计数器
  const unsigned int STATUS_CHECK_INTERVAL = 100; // 每100次循环检查一次状态

  while (!context->closed) {
    if(!context->isCanFd){
      ret=CAN_GetMsgWithSize(context->DevHandle,context->CanIndex,&context->canMsg,1);
      if(ret>0){
          context->tsfn.BlockingCall(&context->canMsg,callback);
      }
    } else {
      ret=CANFD_GetMsg(context->DevHandle,context->CanIndex,&context->canfdMsg,1);
      if(ret>0){
          context->tsfn.BlockingCall(&context->canfdMsg,callbackFd);
      }
    }

    // 周期性检查状态
    {
      statusCheckCounter = 0;
      
      if(!context->isCanFd) {
        // 获取普通CAN状态
        ret = CAN_GetStatus(context->DevHandle, context->CanIndex, (CAN_STATUS*)&context->statusData);
        if(ret == 0) {
          // 只有在出现错误时才上报
          if(((CAN_STATUS*)&context->statusData)->ErrFlag != 0 || ((CAN_STATUS*)&context->statusData)->TECounter != 0|| ((CAN_STATUS*)&context->statusData)->RECounter != 0) 
          {
            context->tserror.BlockingCall(context, statusCallback);
          }
        }
      } else {
        // 获取CANFD总线错误信息
        ret = CANFD_GetBusError(context->DevHandle, context->CanIndex, (CANFD_BUS_ERROR*)&context->statusData);
        if(ret == 0) {
          // 只有在出现错误时才上报
          if(((CANFD_BUS_ERROR*)&context->statusData)->Flags != 0) {
            context->tserror.BlockingCall(context, statusCallback);
          }
        }
      }
    }
      
      // ZCAN_StartCAN(context->channel);
      
      

    

    // 添加短暂延时以降低CPU占用
    std::this_thread::sleep_for(std::chrono::milliseconds(1));
  }
}

// 定义发送消息的AsyncWorker类
class SendCANWorker : public Napi::AsyncWorker {
private:
  int devHandle;
  uint8_t canIndex;
  bool isCanFd;
  CAN_MSG canMsg;
  CANFD_MSG canfdMsg;
  int result;
  Napi::Promise::Deferred deferred;

public:
  SendCANWorker(
    int handle, 
    uint8_t index, 
    bool fd,
    const Napi::Object& msgObj,
    Napi::Promise::Deferred& def
  ) : AsyncWorker(def.Env()), 
      devHandle(handle),
      canIndex(index),
      isCanFd(fd),
      deferred(def) {
    
    // 复制消息数据
    if (!isCanFd) {
      // 普通CAN消息
      canMsg.ID = msgObj.Get("ID").As<Napi::Number>().Uint32Value();
      canMsg.RemoteFlag = msgObj.Get("RemoteFlag").As<Napi::Number>().Uint32Value();
      canMsg.ExternFlag = msgObj.Get("ExternFlag").As<Napi::Number>().Uint32Value();
      canMsg.DataLen = msgObj.Get("DataLen").As<Napi::Number>().Uint32Value();
      
      auto dataBuffer = msgObj.Get("Data").As<Napi::Buffer<uint8_t>>();
      memcpy(canMsg.Data, dataBuffer.Data(), canMsg.DataLen);
    } else {
      // CANFD消息
      canfdMsg.ID = msgObj.Get("ID").As<Napi::Number>().Uint32Value();
      canfdMsg.DLC = msgObj.Get("DLC").As<Napi::Number>().Uint32Value();
      canfdMsg.Flags = msgObj.Get("Flags").As<Napi::Number>().Uint32Value();
      
      // 计算实际数据长度
      unsigned char actualLen = 0;
      if(canfdMsg.DLC <= 8) actualLen = canfdMsg.DLC;
      else if(canfdMsg.DLC == 9) actualLen = 12;
      else if(canfdMsg.DLC == 10) actualLen = 16;
      else if(canfdMsg.DLC == 11) actualLen = 20;
      else if(canfdMsg.DLC == 12) actualLen = 24;
      else if(canfdMsg.DLC == 13) actualLen = 32;
      else if(canfdMsg.DLC == 14) actualLen = 48;
      else if(canfdMsg.DLC == 15) actualLen = 64;
      
      auto dataBuffer = msgObj.Get("Data").As<Napi::Buffer<uint8_t>>();
      memcpy(canfdMsg.Data, dataBuffer.Data(), actualLen);
    }
  }

  void Execute() override {
    // 在工作线程中执行发送
    if (!isCanFd) {
      result = CAN_SendMsg(devHandle, canIndex, &canMsg, 1);
    } else {
      result = CANFD_SendMsg(devHandle, canIndex, &canfdMsg, 1);
    }
  }

  void OnOK() override {
    // 在主线程中处理成功结果
    if (result > 0) {
      deferred.Resolve(Napi::Number::New(Env(), result));
    } else {
      deferred.Reject(Napi::String::New(Env(), "Send failed"));
    }
  }

  void OnError(const Napi::Error& error) override {
    // 在主线程中处理错误
    deferred.Reject(error.Value());
  }
};

// 发送消息的Promise函数
Napi::Promise SendCANMsg(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  auto deferred = Napi::Promise::Deferred::New(env);

  try {
    // 检查参数
    if (info.Length() < 4) {
      deferred.Reject(Napi::String::New(env, "Wrong number of arguments"));
      return deferred.Promise();
    }

    // 创建并启动AsyncWorker
    auto worker = new SendCANWorker(
      info[0].As<Napi::Number>().Int32Value(),
      info[1].As<Napi::Number>().Uint32Value(),
      info[2].As<Napi::Boolean>().Value(),
      info[3].As<Napi::Object>(),
      deferred
    );
    worker->Queue();

    return deferred.Promise();
  } catch (const std::exception& e) {
    deferred.Reject(Napi::String::New(env, e.what()));
    return deferred.Promise();
  }
}
