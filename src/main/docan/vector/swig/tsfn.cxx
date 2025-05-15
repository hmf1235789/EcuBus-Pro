#include "vxlapi.h"
#include "napi.h"
#include <chrono>
#include <thread>
#include <windows.h>
#include <map>
#include <cstring>

// Data structure representing our thread-safe function context
struct TsfnContext {
  std::thread nativeThread;  
  bool closed;                // Flag to signal thread termination
  Napi::ThreadSafeFunction tsfn;
  XLhandle xlHandle;          // Vector handle for notification
  XLportHandle portHandle;    // Vector port handle
};

// Map to store the tsfn context by name
std::map<std::string, TsfnContext *> tsfnContextMap;

// The thread entry point
void threadEntry(TsfnContext *context);

// Creates the thread-safe function and native thread
void CreateTSFN(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  
  // Extract port handle from parameters - directly use Uint64Value
  XLportHandle portHandle = info[0].As<Napi::Number>().Uint64Value();
  Napi::String name = info[1].As<Napi::String>();
  
  // Construct context data
  auto context = new TsfnContext();
  context->closed = false;
  context->portHandle = portHandle;
  
  // Create a new ThreadSafeFunction
  context->tsfn = Napi::ThreadSafeFunction::New(
      env,                          // Environment
      info[2].As<Napi::Function>(), // JS function from caller
      name.Utf8Value().data(),      // Resource name
      1,                            // Max queue size
      1,                            // Initial thread count
      context                       // Context
  );
  
  //create handle

  // Set up Vector notification
  XLstatus status = xlSetNotification(portHandle, &context->xlHandle, 1);
  if (status != XL_SUCCESS) {
    char errorText[256];
    // Get error string from Vector API
    XLstringType errorString = xlGetErrorString(status);
    std::snprintf(errorText, sizeof(errorText), "xlSetNotification failed: %s", errorString);
    Napi::Error::New(env, errorText).ThrowAsJavaScriptException();
    delete context;
    return;
  }
  
  // Start the thread
  context->nativeThread = std::thread(threadEntry, context);
  
  // Store by name
  tsfnContextMap[name.Utf8Value()] = context;
}

void FreeTSFN(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  Napi::String name = info[0].As<Napi::String>();
  
  // Find and remove context from map
  auto it = tsfnContextMap.find(name.Utf8Value());
  if (it != tsfnContextMap.end()) {
    TsfnContext *context = it->second;
    
    // Signal thread to stop
    context->closed = true;
    
    // Wait for thread to finish
    context->nativeThread.join();
    
    // Clean up Vector notification
    XLstatus status = xlDeactivateChannel(context->portHandle, XL_ACTIVATE_NONE);
    
    // Release the thread-safe function
    context->tsfn.Release();
    
    // Clean up
    delete context;
    tsfnContextMap.erase(it);
  }
}

// The thread entry point
void threadEntry(TsfnContext *context) {
  auto callback = []( Napi::Env env, Napi::Function jsCallback, int* value ) {
    jsCallback.Call( {Napi::Number::New( env, *value )} );
    delete value;
  };
  
  XLstatus status;
  unsigned int xl_event_count = 0;
  
  while (!context->closed) {
    HANDLE xl_event = NULL;

    // Wait for the notification event
    status = xlReceive(context->portHandle, &xl_event_count);
    
    if (status == XL_SUCCESS && xl_event_count > 0) {
      // Create data to pass to JS
      int* count = new int;
      *count = xl_event_count;
      
      // Call JS with event count
      context->tsfn.BlockingCall(count, callback);
      
      // Reset for next notification
      xl_event_count = 0;
    } else {
      // Small delay to avoid high CPU usage
      std::this_thread::sleep_for(std::chrono::milliseconds(1));
    }
  }
}
