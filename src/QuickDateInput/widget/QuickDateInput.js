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

    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/html",

    // External libraries
    "QuickDateInput/lib/moment",

    "dojo/text!QuickDateInput/widget/template/QuickDateInput.html"
], function(declare, _WidgetBase, _TemplatedMixin, dojoClass, dojoStyle, dojoConstruct, dojoArray, lang, dojoHtml, moment, widgetTemplate) {
    "use strict";

    // Declare widget's prototype.
    return declare("QuickDateInput.widget.QuickDateInput", [_WidgetBase, _TemplatedMixin], {
        // _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,

        // DOM elements
        inputNodes: null,
        dateInputNode: null,
        infoTextNode: null,

        // Parameters configured in the Modeler.
        date: "",
        currentYear: "",

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _handles: null,
        _contextObj: null,
        _alertDiv: null,
        _readOnly: false,

        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function() {
            //Uncomment the following line to enable debug messages
            logger.debug(this.id + ".constructor");
            this._handles = [];
        },

        // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
        postCreate: function() {
            logger.debug(this.id + ".postCreate");

            if (this.readOnly || this.get("disabled") || this.readonly) {
                this._readOnly = true;
            }

            this._updateRendering();
            this._setupEvents();
        },

        // mxui.widget._WidgetBase.update is called when context is changed or initialized. Implement to re-render and / or fetch data.
        update: function(obj, callback) {
            logger.debug(this.id + ".update");

            this._contextObj = obj;
            this._resetSubscriptions();
            this._updateRendering(callback); // We're passing the callback to updateRendering to be called after DOM-manipulation
        },

        // mxui.widget._WidgetBase.resize is called when the page's layout is recalculated. Implement to do sizing calculations. Prefer using CSS instead.
        resize: function(box) {
            logger.debug(this.id + ".resize");
        },

        // mxui.widget._WidgetBase.uninitialize is called when the widget is destroyed. Implement to do special tear-down work.
        uninitialize: function() {
            logger.debug(this.id + ".uninitialize");
            // Clean up listeners, helper objects, etc. There is no need to remove listeners added with this.connect / this.subscribe / this.own.
        },

        // Attach events to HTML dom elements
        _setupEvents: function() {
            logger.debug(this.id + "._setupEvents");
            this.connect(this.dateInputNode, "change", function(e) {

                logger.debug(this.id + "._onChange");

                var myMoment = moment();

                // Function from mendix object to set an attribute.
                var input = this.dateInputNode.value.trim();

                //check the input for correctness - no letters are allowed
                var check = input.match(/[a-z]/i);
                if (check !== null) {
                    //found one or more letters
                    this._addValidation("Letters are not allowed");
                    return;
                }

                //strip input from seperators
                input = input.replace(/[^0-9]/g, "");

                //date elements
                var days = null;
                var month = null;
                var years = null;

                //choose how to fill the days, month and year based on the lenght of the input
                if (input.length === 0) {
                    myMoment = null;

                } else if (input.length === 4) {
                    //DDMM
                    days = input.substring(0, 2);
                    month = input.substring(2, 4);
                    years = myMoment.year();

                } else if (input.length === 6) {
                    //DDMMYY
                    days = input.substring(0, 2);
                    month = input.substring(2, 4);
                    years = myMoment.year().toString().substring(0, 2) + input.substring(4, 6);

                } else if (input.length === 8) {
                    //DDMMYYYY
                    days = input.substring(0, 2);
                    month = input.substring(2, 4);
                    years = input.substring(4, 8);
                }

                if (myMoment !== null) {
                    myMoment = moment(days + month + years, "DDMMYYYY");
                    if (!this.currentYear && input.length === 4) {
                        //DDMM was used and the currentYear boolean was set to false
                        //we need to check if we need to use the current or next year
                        var currentDate = moment();
                        currentDate.hour(0);
                        currentDate.minute(0);
                        currentDate.second(0);
                        currentDate.millisecond(0);
                        if (myMoment.isBefore(currentDate)) {
                            myMoment.add(1, "year");
                        }
                    }
                }

                logger.debug(this.id + "._onChange" + myMoment === null ? "empty date" : myMoment.format("LLLL"));

                if (myMoment !== null && !myMoment.isValid()) {
                    //the date is invalid (e.g. 33 March)
                    this._addValidation("Invalid date");
                } else {
                    if (myMoment === null) {
                        this._contextObj.set(this.date, "");
                    } else {
                        this._contextObj.set(this.date, myMoment);
                    }
                    this.dateInputNode.value = this._showDateValue(myMoment);
                    this._clearValidations();
                }

            });

            this.connect(this.dateInputNode, "click", function(e) {
                logger.debug(this.id + "._onClick");
                //we want to select the whole input when we click in the field
                this.dateInputNode.setSelectionRange(0, this.dateInputNode.value.length);
            });

        },

        //Display the date as a readable value
        _showDateValue: function(dateVar) {
            logger.debug(this.id + "._showDateValue");
            //return empty string when the date is empty
            if (dateVar === null) {
                return "";
            }

            return dateVar.format("DD/MM/YYYY");
        },

        // Rerender the interface.
        _updateRendering: function(callback) {
            logger.debug(this.id + "._updateRendering");
            this.dateInputNode.disabled = this._readOnly;

            if (this._contextObj !== null) {
                dojoStyle.set(this.domNode, "display", "block");
                var myMoment = this._contextObj.get(this.date) === "" ? null : moment(new Date(this._contextObj.get(this.date)));
                this.dateInputNode.value = this._showDateValue(myMoment);

                dojoHtml.set(this.infoTextNode, this.messageString);
            } else {
                dojoStyle.set(this.domNode, "display", "none");
            }

            // Important to clear all validations!
            this._clearValidations();

            // The callback, coming from update, needs to be executed, to let the page know it finished rendering
            this._executeCallback(callback, "_updateRendering");
        },

        // Handle validations.
        _handleValidation: function(validations) {
            logger.debug(this.id + "._handleValidation");
            this._clearValidations();

            var validation = validations[0],
                message = validation.getReasonByAttribute(this.date);

            if (this._readOnly) {
                validation.removeAttribute(this.date);
            } else if (message) {
                this._addValidation(message);
                validation.removeAttribute(this.date);
            }
        },

        // Clear validations.
        _clearValidations: function() {
            logger.debug(this.id + "._clearValidations");
            dojoConstruct.destroy(this._alertDiv);
            this._alertDiv = null;
            dojoClass.remove(this.domNode, "has-error");
        },

        // Show an error message.
        _showError: function(message) {
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
            dojoClass.add(this.domNode, "has-error");
        },

        // Add a validation.
        _addValidation: function(message) {
            logger.debug(this.id + "._addValidation");
            this._showError(message);
        },

        _unsubscribe: function() {
            if (this._handles) {
                dojoArray.forEach(this._handles, lang.hitch(this, function(handle) {
                    this.unsubscribe(handle);
                }));
                this._handles = [];
            }
        },

        // Reset subscriptions.
        _resetSubscriptions: function() {
            logger.debug(this.id + "._resetSubscriptions");
            // Release handles on previous object, if any.
            this._unsubscribe();

            // When a mendix object exists create subscribtions.
            if (this._contextObj) {
                var objectHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: lang.hitch(this, function(guid) {
                        this._updateRendering();
                    })
                });

                var attrHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    attr: this.date,
                    callback: lang.hitch(this, function(guid, attr, attrValue) {
                        this._updateRendering();
                    })
                });

                var validationHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    val: true,
                    callback: lang.hitch(this, this._handleValidation)
                });

                this._handles = [objectHandle, attrHandle, validationHandle];
            }
        },

        _executeCallback: function(cb, from) {
            logger.debug(this.id + "._executeCallback" + (from ? " from " + from : ""));
            if (cb && typeof cb === "function") {
                cb();
            }
        }
    });
});

require(["QuickDateInput/widget/QuickDateInput"]);
