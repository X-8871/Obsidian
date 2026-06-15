---
type: code
domain: embedded
status: active
---


#pragma once

 
```
#include <stdbool.h>

 

#include "esp_err.h"

 

/*

* WiFiManager 是项目里的联网控制器。

*

* 它负责：

* - 判断设备是否已配网

* - 已配网时直接连接路由器

* - 未配网时进入 BLE 配网流程

* - 维护当前联网状态

*/

typedef enum {

   WIFI_MANAGER_STATE_IDLE = 0,//还没开始

   WIFI_MANAGER_STATE_PROVISIONING,//正在BLE配网

   WIFI_MANAGER_STATE_CONNECTING,//已经有WiFi凭证，正在连路由器

   WIFI_MANAGER_STATE_CONNECTED,//拿到IP

   WIFI_MANAGER_STATE_RECONNECTING,//掉线重连

   WIFI_MANAGER_STATE_DISCONNECTED,

   WIFI_MANAGER_STATE_FAILED,//初始化或流程失败

} wifi_manager_state_t;

 

/* 联网总入口。 */

esp_err_t WiFiManager_Init(void);

 

/* 清除已保存 Wi-Fi 凭据并重启。 */

esp_err_t WiFiManager_ResetProvisioningAndRestart(void);

 

/* 读取当前联网状态。 */

wifi_manager_state_t WiFiManager_GetState(void);

 

/* 是否已经成功连上 Wi-Fi 并获取 IP。 */

bool WiFiManager_IsConnected(void);

 

/* 状态全称字符串。 */

const char *WiFiManager_GetStatusString(void);

 

/* 状态短字符串，供 OLED 等场景显示。 */

const char *WiFiManager_GetStatusShortString(void);

 

/* 当前 IP 字符串。 */

const char *WiFiManager_GetIpString(void);
```
