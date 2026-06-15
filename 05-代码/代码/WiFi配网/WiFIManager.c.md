---
type: code
domain: embedded
status: active
---


```c

#include "WiFiManager.h"

#include <stdio.h>

#include <string.h>

 

#include "esp_event.h"

#include "esp_log.h"

#include "esp_netif.h"

#include "esp_system.h"

#include "esp_wifi.h"

#include "freertos/FreeRTOS.h"

#include "freertos/task.h"

#include "nvs_flash.h"

#include "network_provisioning/manager.h"

#include "network_provisioning/scheme_ble.h"

 

#define WIFI_MANAGER_PROV_QR_VERSION "v1"

#define WIFI_MANAGER_PROV_TRANSPORT  "ble"

#define WIFI_MANAGER_PROV_QR_BASE_URL "https://espressif.github.io/esp-jumpstart/qrcode.html"

#define WIFI_MANAGER_PROV_POP        "eldercare1234"

#define WIFI_MANAGER_PROV_SERVICE_PREFIX "PROV_"

 

static const char *TAG = "WiFiManager";

 

/*

* WiFiManager 是项目里的联网状态机。

*

* 它负责：

* - 初始化 NVS / netif / event loop / esp_wifi

* - 判断设备是否已经配网

* - 决定直接连 Wi-Fi 还是进入 BLE 配网

* - 根据异步事件维护联网状态

*/

static bool s_initialized = false;

static bool s_provisioning_active = false;

static wifi_manager_state_t s_state = WIFI_MANAGER_STATE_IDLE;

static char s_ip_string[16] = "0.0.0.0";

static esp_netif_t *s_sta_netif = NULL;

 

static void set_state(wifi_manager_state_t state)

{

   if (s_state == state) {

       return;

   }

 

   s_state = state;

   ESP_LOGI(TAG, "wifi_state=%s", WiFiManager_GetStatusString());

}

 

/*

* NVS 用于保存 Wi-Fi 配网信息。

* 如果发现页满或版本不兼容，则擦除后重新初始化。

*/

static esp_err_t init_nvs_once(void)

{

   esp_err_t ret = nvs_flash_init();

   if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {

       ESP_ERROR_CHECK(nvs_flash_erase());

       ret = nvs_flash_init();

   }

 

   if (ret == ESP_ERR_INVALID_STATE) {

       return ESP_OK;

   }

 

   return ret;

}

 

static esp_err_t init_netif_once(void)

{

   esp_err_t ret = esp_netif_init();

   if (ret == ESP_ERR_INVALID_STATE) {

       return ESP_OK;

   }

 

   return ret;

}

 

static esp_err_t init_event_loop_once(void)

{

   esp_err_t ret = esp_event_loop_create_default();

   if (ret == ESP_ERR_INVALID_STATE) {

       return ESP_OK;

   }

 

   return ret;

}

 

/*

* 用设备 MAC 后三字节拼出一个配网服务名，

* 方便手机侧区分不同设备。

*/

static void get_device_service_name(char *service_name, size_t max_len)

{

   uint8_t mac[6] = {0};

   esp_wifi_get_mac(WIFI_IF_STA, mac);

   snprintf(service_name,

            max_len,

            "%s%02X%02X%02X",

            WIFI_MANAGER_PROV_SERVICE_PREFIX,

            mac[3],

            mac[4],

            mac[5]);

}

 

/*

* 把 BLE 配网所需的二维码信息打印到日志里，

* 便于调试时手动复制或扫码。

*/

static void log_provisioning_qr(const char *service_name)

{

   char payload[160] = {0};

   snprintf(payload,

            sizeof(payload),

            "{\"ver\":\"%s\",\"name\":\"%s\",\"pop\":\"%s\",\"transport\":\"%s\",\"network\":\"wifi\"}",

            WIFI_MANAGER_PROV_QR_VERSION,

            service_name,

            WIFI_MANAGER_PROV_POP,

            WIFI_MANAGER_PROV_TRANSPORT);

 

   ESP_LOGI(TAG, "BLE provisioning service_name=%s pop=%s", service_name, WIFI_MANAGER_PROV_POP);

   ESP_LOGI(TAG, "Open this URL or scan its QR payload in ESP RainMaker app:");

   ESP_LOGI(TAG, "%s?data=%s", WIFI_MANAGER_PROV_QR_BASE_URL, payload);

}

 

/*

* 这是 WiFiManager 的核心事件入口。

*

* 它统一接收：

* - NETWORK_PROV_EVENT: BLE 配网过程

* - WIFI_EVENT: Wi-Fi 启停、断开

* - IP_EVENT: 获取 IP

* - BLE/protocomm 相关事件

*/

static void wifi_event_handler(void *arg,

                              esp_event_base_t event_base,

                              int32_t event_id,

                              void *event_data)

{

   (void)arg;

 

   if (event_base == NETWORK_PROV_EVENT) {

       switch (event_id) {

       case NETWORK_PROV_START:

           s_provisioning_active = true;

           set_state(WIFI_MANAGER_STATE_PROVISIONING);

           ESP_LOGI(TAG, "BLE provisioning started");

           break;

 

       case NETWORK_PROV_WIFI_CRED_RECV: {

           wifi_sta_config_t *wifi_sta_cfg = (wifi_sta_config_t *)event_data;

           if (wifi_sta_cfg != NULL) {

               ESP_LOGI(TAG,

                        "received Wi-Fi credentials ssid=%s password=%s",

                        (const char *)wifi_sta_cfg->ssid,

                        (const char *)wifi_sta_cfg->password);

           }

           break;

       }

 

       case NETWORK_PROV_WIFI_CRED_FAIL: {

           network_prov_wifi_sta_fail_reason_t *reason =

               (network_prov_wifi_sta_fail_reason_t *)event_data;

           ESP_LOGW(TAG,

                    "provisioning failed, reason=%s",

                    (reason != NULL && *reason == NETWORK_PROV_WIFI_STA_AUTH_ERROR)

                        ? "auth_error"

                        : "ap_not_found");

           set_state(WIFI_MANAGER_STATE_PROVISIONING);

           break;

       }

 

       case NETWORK_PROV_WIFI_CRED_SUCCESS:

           ESP_LOGI(TAG, "provisioning successful");

           if (s_state != WIFI_MANAGER_STATE_CONNECTED) {

               set_state(WIFI_MANAGER_STATE_CONNECTING);

           }

           break;

 

       case NETWORK_PROV_END:

           s_provisioning_active = false;

           ESP_LOGI(TAG, "provisioning finished");

           network_prov_mgr_deinit();

           break;

 

       default:

           break;

       }

       return;

   }

 

   if (event_base == WIFI_EVENT) {

       switch (event_id) {

       case WIFI_EVENT_STA_START:

           if (!s_provisioning_active) {

               set_state(WIFI_MANAGER_STATE_CONNECTING);

           }

           ESP_LOGI(TAG, "wifi station started");

           esp_wifi_connect();

           break;

 

       case WIFI_EVENT_STA_DISCONNECTED: {

           wifi_event_sta_disconnected_t *disconnected = (wifi_event_sta_disconnected_t *)event_data;

           s_ip_string[0] = '\0';

           if (s_initialized) {

               set_state(s_provisioning_active ? WIFI_MANAGER_STATE_PROVISIONING

                                               : WIFI_MANAGER_STATE_RECONNECTING);

               ESP_LOGW(TAG,

                        "wifi disconnected, reason=%d, retrying",

                        disconnected != NULL ? disconnected->reason : -1);

               esp_wifi_connect();

           } else {

               set_state(WIFI_MANAGER_STATE_DISCONNECTED);

           }

           break;

       }

 

       default:

           break;

       }

       return;

   }

 

   if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) {

       ip_event_got_ip_t *got_ip = (ip_event_got_ip_t *)event_data;

       if (got_ip == NULL) {

           set_state(WIFI_MANAGER_STATE_FAILED);

           return;

       }

 

       snprintf(s_ip_string,

                sizeof(s_ip_string),

                IPSTR,

                IP2STR(&got_ip->ip_info.ip));

       set_state(WIFI_MANAGER_STATE_CONNECTED);

       ESP_LOGI(TAG, "wifi connected, ip=%s", s_ip_string);

       return;

   }

 

   if (event_base == PROTOCOMM_TRANSPORT_BLE_EVENT) {

       switch (event_id) {

       case PROTOCOMM_TRANSPORT_BLE_CONNECTED:

           ESP_LOGI(TAG, "BLE transport connected");

           break;

       case PROTOCOMM_TRANSPORT_BLE_DISCONNECTED:

           ESP_LOGI(TAG, "BLE transport disconnected");

           break;

       default:

           break;

       }
