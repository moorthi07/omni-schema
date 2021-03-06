'use strict';

const OmniTypes = require('../types');
const OmniSchema = require('../schemas');
const _ = require('lodash');

// ui-html5.js
// An OmniSchema plugin to generate a UI in pure HTML for editing records that match the schema.


// Hints for effective plugin development:
// 1. Store all plugin specific properties inside a name spaced property
//
// 2. Be sure to define plugin properties for AT LEAST the data types 
//    String, Number, and Boolean (they are the Javascript primatives).
//
// 3. If multiple onType functionality specifications are used, be sure
//    to list them in the order of most general to most specific
//
// 4. Try to define onType functionality that matches 'enumValues'
//	  to ensure there is default behavior for any enumerations.
//
// 5. Create a namespace off of the OmniSchema type to prevent name clashes
//    from other plugins.

// Our namespace for this plugin
OmniSchema.html5 = {};

// Our "define..Type" method to decorate the data types with attributes that
// tell us which HTML elements and attributes to use for each type...
OmniSchema.html5.defineHtmlType = function(name, elementName, props) {
	let htmlSpec = { htmlSpec: Object.assign({ elementName }, props) };
	OmniTypes.defineDataType(name, htmlSpec);
}


OmniSchema.html5.getPropsAsAttributeString = function(props, ignoreProps) {

	if (!props) {
		// If we have no attributes, return a single blank space...
		return ' ';
	}

    let attribs = '';

    _.forOwn(_.omit(props, ignoreProps), function(value, key) {
    	attribs = attribs.concat(` ${key}="${value}"`);
    });

    return attribs;
}


let plugin = function() {

	const defineHtmlType = OmniSchema.html5.defineHtmlType;

	// MUST at least define controls for Javascript primatives...
	defineHtmlType('String', 'input', { type: 'text'} );
	defineHtmlType('Number', 'input', { type: 'number' });
	defineHtmlType('Boolean', 'input', {type: 'checkbox'});

	// And now, define specialized controls for the specialzed data types that vary
	// from our defaults. Inheritance will take care of the rest...
	defineHtmlType('Text', 'textarea', { rows: 3 });
	defineHtmlType('FullName', 'input', {type: 'text', autocomplete: 'name'});
	defineHtmlType('FirstName', 'input', {type: 'text', autocomplete: 'given-name'});
	defineHtmlType('LastName', 'input', {type: 'text', autocomplete: 'family-name'});
	defineHtmlType('Password', 'input', {type: 'password'});
	defineHtmlType('Phone', 'input', {type: 'tel'});
	defineHtmlType('Email', 'input', {type: 'email', autocomplete: 'email'});
	defineHtmlType('Url', 'input', {type: 'url'});
	defineHtmlType('StreetAddress', 'input', { type: 'text', autocomplete: 'address-line1'});
	defineHtmlType('PostalCode', 'input', { type: 'text', autocomplete: 'postal-code'});

	defineHtmlType('Integer', 'input', { type: 'range', min: Number.MIN_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER });

	defineHtmlType('Date', 'input', {type: 'date'});
	defineHtmlType('Time', 'input', {type: 'time'});
	defineHtmlType('DateTime', 'input', {type: 'datetime-local'});


	function getEnumAsSelect(field, controlProps, defaultValue, fieldNamePrefix) {
		let code = `<select size="1" name="${fieldNamePrefix}${field.name}" ${field.isRequired?'required="required"':''}>\n`;
		let dt = field.type;
		let strDefault;
		if (typeof defaultValue !== 'undefined' && defaultValue !== null) {
			strDefault = defaultValue.toString();
		}
		_.forEach(dt.enumValues, function(ev, i) {
			code = code.concat(`  <option value="${ev.value}" ${ev.value === strDefault? 'selected': ''}>${ev.label}</option>\n`);
		})
		code = code.concat('</select>\n');
		return code;
	}



	function getEnumAsRadio(field, controlProps, defaultValue, fieldNamePrefix) {
		let code = '';
		let dt = field.type;
		_.forEach(dt.enumValues, function(ev, i) {
			let mergedProps = Object.assign({}, controlProps, { type: 'radio' });
			if (ev.value === defaultValue) {
				mergedProps.checked = true;
			}
			code = code.concat(`<input${OmniSchema.html5.getPropsAsAttributeString(mergedProps, 'elementName')} ${field.isRequired?'required="required" ':''}name="${fieldNamePrefix}${field.name}" value="${ev.value}" />`);
			code = code.concat(`&nbsp;${ev.label}<br/>\n`);
		})
		return code;
	}


	function getEnumAsCheckbox(field, controlProps, defaultValue, fieldNamePrefix) {
			let mergedProps = Object.assign({}, controlProps, { type: 'checkbox' });
			if (defaultValue) {
				mergedProps.checked = true;
			}
		return `<input${OmniSchema.html5.getPropsAsAttributeString(mergedProps, 'elementName')} ${field.isRequired?'required="required" ':''}name="${fieldNamePrefix}${field.name}" />`;
	}

	// Now, mix in functionality to OmniSchema...
	OmniSchema.mixin({

		onSchema: [
			{ func: function getHtmlForm(submitButtonName, formProps, defaultData) {

				let schema = this;
				let code = `<form${OmniSchema.html5.getPropsAsAttributeString(formProps)} >\n`;
				code = code.concat(schema.getHtmlFields(defaultData, ''));
				if (submitButtonName) {
					code = code.concat(`<input type="submit" value="${submitButtonName}" />\n`);
				}
				else if (!_.isNull(submitButtonName)) {
					code = code.concat(`<input type="submit" />\n`);
				}
				code = code.concat('</form>\n');
				return code;
			}},


			{ func: function getHtmlFields(defaultData, fieldNamePrefix) {

				let schema = this;
				let code = '';
				let fl = this.getFieldList();
				for (let fieldName of fl) {
					let field = schema.getField(fieldName);
					if ((field instanceof OmniSchema.OmniField) && !field.uiExclude) {
						let defaultValue = _.get(defaultData, field.name);
						code = code.concat(field.getHtml(defaultValue, fieldNamePrefix), '\n');
					}
				}
				return code;
			}},
			


		],

		onField: {
			func: function getHtml(defaultValue, fieldNamePrefix) {
				if (this.type instanceof OmniSchema) {
					// TODO handle references to other schemas...
					return `<div class="_${this.type.collectionName} _obj">\n<label class="_objLabel">${this.label}</label>\n${this.type.getHtmlFields(defaultValue[this.name], fieldNamePrefix + this.name + '.')}</div>`;
				}
				else if (!this.type.getHtml) {
					throw new Error('getHtml has not been defined for datatype ' + this.type.name);
				}
				return `<label>${this.label} ${this.type.getHtml(this, {}, defaultValue, fieldNamePrefix)}</label>`;
			}
		},

		// For Types, always define in the order of most general to most specific...
		onType: [
			{	matches: {
					htmlSpec: { elementName: 'input'}
				},

				func: function getHtml(field, controlProps, defaultValue, fieldNamePrefix) {
					if (typeof defaultValue !== 'undefined') {
						controlProps.value = defaultValue;
					}
					let mergedProps = Object.assign({}, this.htmlSpec, controlProps);
					return `<input${OmniSchema.html5.getPropsAsAttributeString(mergedProps, 'elementName')} ${field.isRequired?'required="required" ':''}name="${fieldNamePrefix}${field.name}" />`;
				}
			},

			{	matches: 'enumValues',

				func: function getHtml(field, controlProps, defaultValue, fieldNamePrefix) {
					let presentation = _.get(field, 'ui.presentation');
					if (presentation) {
						// User has explicitly requested a presentation for this enumeration...
						switch (presentation) {
							case 'select':
								return getEnumAsSelect(field, Object.assign({}, this.htmlSpec, controlProps), defaultValue, fieldNamePrefix);

							case 'radio':
								return getEnumAsRadio(field, Object.assign({}, this.htmlSpec, controlProps), defaultValue, fieldNamePrefix);

							case 'checkbox':
								if (field.type.jsType === 'boolean') {
									return getBoolAsCheckbox(field, Object.assign({}, this.htmlSpec, controlProps), defaultValue, fieldNamePrefix);
								}
								break;

							default:
								break;
						} // switch
					}

					// Return default presentation...
					return getEnumAsSelect(field, Object.assign({}, this.htmlSpec, controlProps), defaultValue, fieldNamePrefix);
				}

			},

		]

	});
}

module.exports = { plugin };