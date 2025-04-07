"use strict";

const utils = require("../utils");
const log = require("npmlog");
const generateOfflineThreadingId = require("../utils"); // Assuming this is available

module.exports = function(defaultFuncs, api, ctx) {
  return function editMessage(text, messageID, callback) {
    let resolveFunc = function() {};
    let rejectFunc = function() {};
    const returnPromise = new Promise(function(resolve, reject) {
      resolveFunc = resolve;
      rejectFunc = reject;
    });
    
    if (!callback) {
      callback = function(err) {
        if (err) {
          return rejectFunc(err);
        }
        resolveFunc();
      };
    }
    
    if (!ctx.mqttClient) {
      const error = new Error("Not connected to MQTT");
      log.error("editMessage", error);
      return callback(error);
    }
    
    ctx.wsReqNumber += 1;
    ctx.wsTaskNumber += 1;
    
    const queryPayload = {
      message_id: messageID,
      text: text
    };
    
    const query = {
      failure_count: null,
      label: "742",
      payload: JSON.stringify(queryPayload),
      queue_name: "edit_message",
      task_id: ctx.wsTaskNumber
    };
    
    const context = {
      app_id: "2220391788200892",
      payload: {
        data_trace_id: null,
        epoch_id: parseInt(generateOfflineThreadingId()),
        tasks: [query],
        version_id: "6903494529735864"
      },
      request_id: ctx.wsReqNumber,
      type: 3
    };
    
    context.payload = JSON.stringify(context.payload);
    
    ctx.mqttClient.publish("/ls_req", JSON.stringify(context), { qos: 1, retain: false }, function(err) {
      if (err) {
        log.error("editMessage", err);
        return callback(err);
      }
      callback(null);
    });
    
    return returnPromise;
  };
};