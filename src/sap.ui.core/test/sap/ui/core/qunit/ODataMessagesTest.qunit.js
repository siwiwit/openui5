/* global module start test asyncTest expect ok equal deepEqual */

QUnit.config.testTimeout = 6000;

/* eslint-disable no-unused-vars */
function runODataMessagesTests() {
/* eslint-enable no-unused-vars */
"use strict";
	QUnit.config.autostart = false;

	jQuery.sap.require("sap.ui.model.odata.v2.ODataModel");
	jQuery.sap.require("sap.ui.model.odata.ODataMessageParser");
	jQuery.sap.require("sap.ui.core.message.MessageManager");

	var oInput = new sap.m.Input({value:"{json>/Products(1)/ProductName}"});
	oInput.placeAt("content");
	
	var oInput2 = new sap.m.Input({value:"{xml>/Products(1)/ProductName}"});
	oInput2.placeAt("content");
	
	
	
	var sServiceURI = "fakeservice://testdata/odata/northwind/";
	// var sServiceURI = "/testsuite/proxy/http/services.odata.org/V3/Northwind/Northwind.svc/";
	var mModelOptions = {
		async: true,
		useBatch: false
	};

	var oModelJson, oModelXml;
	
	// Create MessageManager instance and set Message Model in TimeOut...
	sap.ui.getCore().getMessageManager();
	
	// Start delayed so the message model is available
	setTimeout(function() {
		start();
	}, 100);




	var oJsonLayout = new sap.ui.layout.VerticalLayout({
		content: { 
			path: "json>/Products", 
			template: new sap.ui.commons.Button({
				text: { path: "json>ProductName" }
			})
		}
	});

	var oXmlLayout = new sap.ui.layout.VerticalLayout({
		content: { 
			path: "xml>/Products", 
			template: new sap.ui.commons.Button({
				text: { path: "xml>ProductName" }
			})
		}
	});
	
	var oMainLayout = sap.ui.layout.HorizontalLayout({
		content: [ oJsonLayout, oXmlLayout ]
	});
	oMainLayout.placeAt("content");


	asyncTest("JSON format", function() {
		mModelOptions.json = true;
		oModelJson = new sap.ui.model.odata.v2.ODataModel(sServiceURI, mModelOptions);
		sap.ui.getCore().setModel(oModelJson, "json");

		var oMessageModel = sap.ui.getCore().getMessageManager().getMessageModel();

		equal(oMessageModel.getProperty("/").length, 0, "No message has been added");

		ok(oInput.getValueState() === "None", "ValueState has not been set");

		var iRequests = 0;
		oModelJson.attachRequestCompleted(function(oRequest) {
			iRequests++;
			if (oRequest.getParameter("url").indexOf("$count") == -1) {
				ok(iRequests === 2, "Two Requests (with messages) has been processed");
				setTimeout(function() {
					ok(oInput.getValueState() === "Error", "ValueState has been set to 'Error'");

					var iMessages = oMessageModel.getProperty("/").length;
					equal(iMessages, 21, "One message has been added for every Item and one for the Collection");
					
					oModelJson.destroy();
					start();
				}, 0);
			}
		});
	});

	asyncTest("XML format", function() {
		mModelOptions.json = false;
		oModelXml = new sap.ui.model.odata.v2.ODataModel(sServiceURI, mModelOptions);
		sap.ui.getCore().setModel(oModelXml, "xml");
		var oMessageModel = sap.ui.getCore().getMessageManager().getMessageModel();

		ok(oInput2.getValueState() === "None", "ValueState has not been set");

		var iRequests = 0;
		oModelXml.attachRequestCompleted(function(oRequest) {
			iRequests++;
			var iMessages = oMessageModel.getProperty("/").length;
			if (oRequest.getParameter("url").indexOf("$count") == -1) {
				ok(iRequests === 2, "Two Requests (with messages) has been processed");
				setTimeout(function() {
					ok(oInput2.getValueState() === "Error", "ValueState has been set to 'Error'");

					var iMessages = oMessageModel.getProperty("/").length;
					equal(iMessages, 21, "One message has been added for every Item and one for the Collection");
					
					oModelXml.destroy();
					start();
				}, 0);
			}
		});
	});
	
	
	asyncTest("Function Imports", function() {
		var oModel = new sap.ui.model.odata.v2.ODataModel("fakeservice://testdata/odata/function-imports/", {
			useBatch: false,
			json: false
		});
		var oMessageModel = sap.ui.getCore().getMessageManager().getMessageModel();
		
		equal(oMessageModel.getProperty("/").length, 0, "No messages are set at the beginning of the test")
		
		oModel.attachMetadataLoaded(function() {
			var mMessages = oMessageModel.getProperty("/");
			var oMetadata = oModel.getServiceMetadata();

			testFunctionTarget({
				url: "/EditProduct",
				parameters: {
					"ProductUUID": "00000000-0000-0000-0000-000000000001",	
					"foo": "bar"
				},
				
				numMessages: 1,
				lastTarget: "/Products(guid'10000000-0000-0000-0000-000000000000')",
				final: false
			});

			testFunctionTarget({
				url: "/EditProduct",
				parameters: {
					"ProductUUID": "00000000-0000-0000-0000-000000000002",	
					"foo": "bar"
				},
				
				numMessages: 2,
				lastTarget: "/Products(guid'20000000-0000-0000-0000-000000000000')",
				final: false
			});

			testFunctionTarget({
				url: "/EditProduct",
				parameters: {
					"ProductUUID": "30000000-0000-0000-0000-000000000003",	
					"foo": "bar"
				},
				
				numMessages: 3,
				lastTarget: "/Products(guid'30000000-0000-0000-0000-000000000003')",
				final: true
			});


			function testFunctionTarget(mTestOptions) {
				// Set default values
				mTestOptions.method      = mTestOptions.method      ? mTestOptions.method      : "POST";
				mTestOptions.parameters  = mTestOptions.parameters  ? mTestOptions.parameters  : {};
				mTestOptions.numMessages = mTestOptions.numMessages ? mTestOptions.numMessages : {};
				mTestOptions.final       = mTestOptions.final       ? mTestOptions.final       : false;
				mTestOptions.lastTarget  = mTestOptions.lastTarget  ? mTestOptions.lastTarget  : "INVALIDTARGET";
				
				testFunctionTarget.aTests = testFunctionTarget.aTests ? testFunctionTarget.aTests : [];
				testFunctionTarget.aTests.push(mTestOptions);
				
				var fnNextTest = function() {
					var mTestOptions;
					if (testFunctionTarget.aTests.length > 0) {
						mTestOptions = testFunctionTarget.aTests.shift();
					} else {
						testFunctionTarget._running = false;
					}
					
					oModel.callFunction(mTestOptions.url, {
						method: mTestOptions.method,
						urlParameters: mTestOptions.parameters,
						success: function() {
							var aMessages = oMessageModel.getProperty("/");
							equal(aMessages.length, mTestOptions.numMessages, mTestOptions.numMessages + " messages set after the function import");
							equal(aMessages[aMessages.length - 1].target, mTestOptions.lastTarget, "Message has correct target");
							
							if (mTestOptions.final) {
								testFunctionTarget._running = false;
								oModel.destroy();
								start();
							} else {
								fnNextTest();
							}
						}
					});
					
				};
				
				if (!testFunctionTarget._running) {
					testFunctionTarget._running = true;
					fnNextTest();
				}
				
			}
		});
	});
	

	var fnTestTechnicalErrors = function(bJson) {
		expect(20);
		
		var oModel = new sap.ui.model.odata.v2.ODataModel("fakeservice://testdata/odata/technical-errors/", {
			useBatch: false,
			json: bJson
		});

		var iStartCounter = 4;
		var fnStart = function() { 
			if (!--iStartCounter) {
				oModel.destroy();
				start();
			}
		};
		
		var iExpectedMessages = 0;


		var oMessageModel = sap.ui.getCore().getMessageManager().getMessageModel();
		
		equal(oMessageModel.getProperty("/").length, 0, "No messages are set at the beginning of the test")
		
		oModel.attachMetadataLoaded(function() {
			var mMessages = oMessageModel.getProperty("/");
			var oMetadata = oModel.getServiceMetadata();
			
			var fnCheckAddedMessages = function() {
				iExpectedMessages += 2;

				var aMessages = oMessageModel.getProperty("/");
				equals(aMessages.length, iExpectedMessages, "There should be more error messages");
				
				equals(aMessages[iExpectedMessages - 2].getMessage(), "Field \"SALESORDERID\" cannot be changed since it is read only", "Correct message text");
				equals(aMessages[iExpectedMessages - 2].getType(), sap.ui.core.MessageType.Error, "Correct message severity");
				
				equals(aMessages[iExpectedMessages - 1].getMessage(), "Some other error", "Correct message text");
				equals(aMessages[iExpectedMessages - 1].getType(), sap.ui.core.MessageType.Error, "Correct message severity");
				
				fnStart();
			};
			
			var fnCheckAddedMessages2 = function() {
				iExpectedMessages += 6;
				
				var aMessages = oMessageModel.getProperty("/");
				equals(aMessages.length, iExpectedMessages, "There should be more error messages");
				
				// Important: In this case the message order has been changed since errors come before warnings
				var mAddesMessages = {
					"Error|SY/530|/Error2(400)/|Warning": false,
					"Error|/IWBEP/CX_MGW_BUSI_EXCEPTION|/Error2(400)/|Business Error with details in TEA application": false,
					"Error||/Error2(400)/Property|Multiple error/warning messages": false,
					"Error||/Error2(400)/Message|Inner error": false,
					"Error||/Error2(400)/Type|Inner error 2": false,
					"Warning||/Error2(400)/Type|Warning": false
				};
				
				for (var i = aMessages.length - 6; i < aMessages.length; ++i) {
					var oM = aMessages[i]
					var sIdentifier = [oM.getType(), oM.getCode(), oM.getTarget(), oM.getMessage()].join("|");
					
					equals(mAddesMessages[sIdentifier], false, "Message is as expected");
					mAddesMessages[sIdentifier] = true;
				}
				
				var bAllMessagesArrived = Object.keys(mAddesMessages).reduce(function(vPrev, sCurrent) {
					return vPrev && mAddesMessages[sCurrent] === true;
				}, true);
				ok (bAllMessagesArrived, "All expected messages are there");
				
				fnStart();
			};
			
			oModel.read("/Error(400)", {
				success: function() {
					ok(false, "This should return an error from the server and thus fail");
				},
				error: fnCheckAddedMessages
			});

			oModel.read("/Error(500)", {
				success: function() {
					ok(false, "This should return an error from the server and thus fail");
				},
				error: fnCheckAddedMessages
			});

			oModel.read("/Error2(400)", {
				success: function() {
					ok(false, "This should return an error from the server and thus fail");
				},
				error: fnCheckAddedMessages2
			});

			oModel.read("/Error(900)", {
				success: function() {
					ok(false, "This should return an error from the server and thus fail");
				},
				error: function() {
					var aMessages = oMessageModel.getProperty("/");
					equals(aMessages.length, iExpectedMessages, "There should be no extra error messages for status 900");
					
					fnStart();
				}
			});

		});		
	};

	asyncTest("Technical Errors (JSON)", fnTestTechnicalErrors.bind(this, true));
	asyncTest("Technical Errors (XML)", fnTestTechnicalErrors.bind(this, false));
	
	
	var fnTestLongtextUrl = function(bJson) {
		expect(15);
		
		var oModel = new sap.ui.model.odata.v2.ODataModel("fakeservice://testdata/odata/technical-errors/", {
			useBatch: false,
			json: bJson
		});

		var iStartCounter = 4;
		var fnStart = function() { 
			if (!--iStartCounter) {
				oModel.destroy();
				start();
			}
		};
		
		var iExpectedMessages = 0;


		var oMessageModel = sap.ui.getCore().getMessageManager().getMessageModel();
		equal(oMessageModel.getProperty("/").length, 0, "No messages are set at the beginning of the test")
		
		oModel.attachMetadataLoaded(function() {
			var mMessages = oMessageModel.getProperty("/");
			var oMetadata = oModel.getServiceMetadata();
			
			var fnCheckAddedMessages = function() {
				iExpectedMessages += 2;

				var aMessages = oMessageModel.getProperty("/");
				equals(aMessages.length, iExpectedMessages, "There should be more error messages");
				
				// All messages should have longtext URLs
				for (var i = aMessages.length - 2; i < aMessages.length; ++i) {
					ok(aMessages[i].getDescriptionUrl(), "Message has longtext URL");
				}
				
				fnStart();
			};
			
			var fnCheckAddedMessages2 = function() {
				iExpectedMessages += 6;
				
				var aMessages = oMessageModel.getProperty("/");
				equals(aMessages.length, iExpectedMessages, "There should be more error messages");

				// No messages should have longtext URLs
				for (var i = aMessages.length - 6; i < aMessages.length; ++i) {
					ok(!aMessages[i].getDescriptionUrl(), "Message has no longtext URL");
				}
				
				fnStart();
			};
			
			oModel.read("/Error(400)", {
				success: function() {
					ok(false, "This should return an error from the server and thus fail");
				},
				error: fnCheckAddedMessages
			});

			oModel.read("/Error(500)", {
				success: function() {
					ok(false, "This should return an error from the server and thus fail");
				},
				error: fnCheckAddedMessages
			});

			oModel.read("/Error2(400)", {
				success: function() {
					ok(false, "This should return an error from the server and thus fail");
				},
				error: fnCheckAddedMessages2
			});

			oModel.read("/Error(900)", {
				success: function() {
					ok(false, "This should return an error from the server and thus fail");
				},
				error: function() {
					var aMessages = oMessageModel.getProperty("/");
					equals(aMessages.length, iExpectedMessages, "There should be no extra error messages for status 900");
					
					fnStart();
				}
			});

		});		
	};

	
	asyncTest("LongText URL (JSON)", fnTestLongtextUrl.bind(this, true));
	asyncTest("LongText URL (XML)", fnTestLongtextUrl.bind(this, false));
	
	asyncTest("ODataMessageParser without ODataModel", function() {
		var sServiceURI = "fakeservice://testdata/odata/northwind";
		
		var oMessageModel = sap.ui.getCore().getMessageManager().getMessageModel();
		equal(oMessageModel.getProperty("/").length, 0, "No messages are set at the beginning of the test")
		
		var oMetadata = new sap.ui.model.odata.ODataMetadata(sServiceURI + "/$metadata", {});
		oMetadata.loaded().then(function() {
			
			// Get Messages sent to console
			var fnError = console.error;
			var fnWarn = console.warn;
			var fnLog = console.log;
			var fnDebug = console.debug;
			var fnInfo = console.info;
			
			var iCounter = 0;
			var fnCount = function(sMessage) {
				if (sMessage.indexOf("[OData Message] ") > -1) {
					iCounter++;
				}
			}
			
			console.error = console.warn = console.log = console.debug = console.info = fnCount;
			
			var oParser = new sap.ui.model.odata.ODataMessageParser(sServiceURI, oMetadata);
			
			var oRequest = {
				requestUri: "fakeservice://testdata/odata/northwind/Test"
			};
			
			var oResponse = {
				statusCode: "200", // Parse Header...
				body: "Ignored",
				headers: {
					"Content-Type": "text/plain;charset=utf-8",
					"DataServiceVersion": "2.0;",
					"sap-message": JSON.stringify({
						"code":		"999",
						"message":	"This is test message",
						"severity":	"error",
						"details": []
					})
				}
			};
			oParser.parse(oResponse, oRequest);
			equal(iCounter, 1, "Message from 'sap-message' header was added")
			
			oResponse = {
				statusCode: "200", // Parse Header...
				body: "Ignored",
				headers: {
					"Content-Type": "text/plain;charset=utf-8",
					"DataServiceVersion": "2.0;",
					"message": JSON.stringify({
						"code":		"999",
						"message":	"This is an error test message",
						"severity":	"error",
						"details": [{
							"code":		"999",
							"message":	"This is a warning test message",
							"severity":	"warning",
						}, {
							"code":		"999",
							"message":	"This is a success test message",
							"severity":	"success"
						}, {
							"code":		"999",
							"message":	"This is an information test message",
							"severity":	"info"
						}]
					})
				}
			};
			oParser.setHeaderField("message");
			oParser.parse(oResponse, oRequest);
			equal(iCounter, 5, "Message from 'message' header was added")

			oResponse = {
				statusCode: "200", // Parse Header...
				body: "Ignored",
				headers: {
					"Content-Type": "text/plain;charset=utf-8",
					"DataServiceVersion": "2.0;",
					"invalid": "{ invalid: Json }"
				}
			};
			oParser.setHeaderField("invalid");
			oParser.parse(oResponse, oRequest);
			equal(iCounter, 5, "No message from 'invalid' header was added")
			
			oParser.setHeaderField("none");
			oParser.parse(oResponse, oRequest);
			equal(iCounter, 5, "No message from non-existant 'none' header was added")
			
			
			// Clean up
			console.error = fnError;
			console.warn = fnWarn;
			console.info = fnInfo;
			console.debug = fnDebug;
			console.info = fnInfo;
			console.log = fnLog;
			
			oMetadata.destroy();
			oParser.destroy();
			start();
		});
		
		
		
	});
	
	
	// TODO: Function imports with multiple key fields
}
