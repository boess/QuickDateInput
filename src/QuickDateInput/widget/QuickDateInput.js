/*global logger*/
/*
    QuickDateInput
    ========================

    @file      : QuickDateInput.js
    @version   : 1.0.0
    @author    : <You>
    @date      : 2016-12-01
    @copyright : KRVE 2016
    @license   : Apache 2

    Documentation
    ========================
    Describe your widget here.
*/

// Required module list. Remove unnecessary modules, you can always get them back from the boilerplate.
define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",

    "mxui/dom",
    "dojo/dom",
    "dojo/dom-prop",
    "dojo/dom-geometry",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/text",
    "dojo/html",
    "dojo/_base/event",
    
    // External libraries
    "QuickDateInput/lib/moment",
    "QuickDateInput/lib/jquery-1.11.2",
    
    "dojo/text!QuickDateInput/widget/template/QuickDateInput.html"
], function (declare, _WidgetBase, _TemplatedMixin, dom, dojoDom, dojoProp, dojoGeometry, dojoClass, dojoStyle, dojoConstruct, dojoArray, dojoLang, dojoText, dojoHtml, dojoEvent, moment, _jQuery, widgetTemplate) {
    "use strict";

    var $ = _jQuery.noConflict(true);

    // Declare widget's prototype.
    return declare("QuickDateInput.widget.QuickDateInput", [ _WidgetBase, _TemplatedMixin ], {
        // _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,

        // DOM elements
        inputNodes: null,
        dateInputNode: null,
        infoTextNode: null,

        // Parameters configured in the Modeler.
        date: "",

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _handles: null,
        _contextObj: null,
        _alertDiv: null,
        _readOnly: false,
        
        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function () {
            //Uncomment the following line to enable debug messages
            logger.level(logger.DEBUG);                        
            logger.debug(this.id + ".constructor");
            this._handles = [];
        },

        // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
        postCreate: function () {
            logger.debug(this.id + ".postCreate");

            if (this.readOnly || this.get("disabled") || this.readonly) {
              this._readOnly = true;
            }

            this._updateRendering();
            this._setupEvents();
        },

        // mxui.widget._WidgetBase.update is called when context is changed or initialized. Implement to re-render and / or fetch data.
        update: function (obj, callback) {
            logger.debug(this.id + ".update");

            this._contextObj = obj;
            this._resetSubscriptions();
            this._updateRendering(callback); // We're passing the callback to updateRendering to be called after DOM-manipulation
        },

        // mxui.widget._WidgetBase.enable is called when the widget should enable editing. Implement to enable editing if widget is input widget.
        enable: function () {
          logger.debug(this.id + ".enable");
        },

        // mxui.widget._WidgetBase.enable is called when the widget should disable editing. Implement to disable editing if widget is input widget.
        disable: function () {
          logger.debug(this.id + ".disable");
        },

        // mxui.widget._WidgetBase.resize is called when the page's layout is recalculated. Implement to do sizing calculations. Prefer using CSS instead.
        resize: function (box) {
          logger.debug(this.id + ".resize");
        },

        // mxui.widget._WidgetBase.uninitialize is called when the widget is destroyed. Implement to do special tear-down work.
        uninitialize: function () {
          logger.debug(this.id + ".uninitialize");
            // Clean up listeners, helper objects, etc. There is no need to remove listeners added with this.connect / this.subscribe / this.own.
        },

        // We want to stop events on a mobile device
        _stopBubblingEventOnMobile: function (e) {
            logger.debug(this.id + "._stopBubblingEventOnMobile");
            if (typeof document.ontouchstart !== "undefined") {
                dojoEvent.stop(e);
            }
        },

        // Attach events to HTML dom elements
        _setupEvents: function () {
            logger.debug(this.id + "._setupEvents");
            this.connect(this.dateInputNode, "change", function(e) {
                
                logger.debug(this.id + "._onChange");
                
                // Function from mendix object to set an attribute.
                var input = this.dateInputNode.value.trim();
                //strip input from seperators
                input = input.replace(/[^0-9]/g , "");
                
                var myMoment = moment();
                
                //date elements
                var days = null;
                var month= null;
                var years= null;        
                                 
                if(input.length===0) {
                    myMoment = "";
                }
                else if(input.length===4) {
                    //DDMM
                    days = input.substring(0,2);
                    month = input.substring(2,4);
                    years = myMoment.year();
                }
                else if(input.length===6) {
                    //DDMMYY
                    days = input.substring(0,2);
                    month = input.substring(2,4);
                    years = myMoment.year().toString().substring(0,2) + input.substring(4,6);
                }
                else if(input.length===8) {
                    //DDMMYYYY
                    days = input.substring(0,2);
                    month = input.substring(2,4);
                    years = input.substring(4,8);
                }
                
                if(myMoment !== "") {
                    myMoment = moment(days+month+years, "DDMMYYYY");
                }
                
                if (!myMoment.isValid()) {
                    myMoment = moment();
                    this._contextObj.set(this.date, myMoment); //done to force refresh...there must be a better way
                    this._contextObj.set(this.date, "");
                    this._addValidation("Invalid date format");
                } else {
                    this._contextObj.set(this.date, myMoment);
                    this.dateInputNode.value = this._showDateValue(myMoment);
                    this._clearValidations();
                }
        
            });        
        },

        //Display the date as a readable value
        _showDateValue: function(dateVar) {
            //return empty string when the date value is empty
            if(dateVar === "") {
                return "";
            }
            
            return dateVar.format("DD/MM/YYYY");            
        },
        
        // Rerender the interface.
        _updateRendering: function (callback) {
            logger.debug(this.id + "._updateRendering");
            this.dateInputNode.disabled = this._readOnly;

            if (this._contextObj !== null) {
                dojoStyle.set(this.domNode, "display", "block");
                var myMoment = moment(new Date(this._contextObj.get(this.date)));
                this.dateInputNode.value = this._showDateValue(myMoment);
                
                dojoHtml.set(this.infoTextNode, this.messageString);
            } else {
                dojoStyle.set(this.domNode, "display", "none");
            }

            // Important to clear all validations!
            this._clearValidations();

            // The callback, coming from update, needs to be executed, to let the page know it finished rendering
            mendix.lang.nullExec(callback);
        },

        // Handle validations.
        _handleValidation: function (validations) {
            logger.debug(this.id + "._handleValidation");
            this._clearValidations();

            var validation = validations[0],
                message = validation.getReasonByAttribute(this.backgroundColor);

            if (this._readOnly) {
                validation.removeAttribute(this.backgroundColor);
            } else if (message) {
                this._addValidation(message);
                validation.removeAttribute(this.backgroundColor);
            }
        },

        // Clear validations.
        _clearValidations: function () {
            logger.debug(this.id + "._clearValidations");
            dojoConstruct.destroy(this._alertDiv);
            this._alertDiv = null;
        },

        // Show an error message.
        _showError: function (message) {
            logger.debug(this.id + "._showError");
            if (this._alertDiv !== null) {
                dojoHtml.set(this._alertDiv, message);
                return true;
            }
            this._alertDiv = dojoConstruct.create("div", {
                "class": "alert alert-danger",
                "innerHTML": message
            });
            dojoConstruct.place(this._alertDiv, this.domNode);
        },

        // Add a validation.
        _addValidation: function (message) {
            logger.debug(this.id + "._addValidation");
            this._showError(message);
        },

        _unsubscribe: function () {
          if (this._handles) {
              dojoArray.forEach(this._handles, function (handle) {
                  mx.data.unsubscribe(handle);
              });
              this._handles = [];
          }
        },

        // Reset subscriptions.
        _resetSubscriptions: function () {
            logger.debug(this.id + "._resetSubscriptions");
            // Release handles on previous object, if any.
            this._unsubscribe();

            // When a mendix object exists create subscribtions.
            if (this._contextObj) {
                var objectHandle = mx.data.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: dojoLang.hitch(this, function (guid) {
                        this._updateRendering();
                    })
                });

                var attrHandle = mx.data.subscribe({
                    guid: this._contextObj.getGuid(),
                    attr: this.backgroundColor,
                    callback: dojoLang.hitch(this, function (guid, attr, attrValue) {
                        this._updateRendering();
                    })
                });

                var validationHandle = mx.data.subscribe({
                    guid: this._contextObj.getGuid(),
                    val: true,
                    callback: dojoLang.hitch(this, this._handleValidation)
                });

                this._handles = [ objectHandle, attrHandle, validationHandle ];
            }
        }
    });
});

require(["QuickDateInput/widget/QuickDateInput"]);
