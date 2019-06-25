/**
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; under version 2
 * of the License (non-upgradable).
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 *
 * Copyright (c) 2019 (original work) Open Assessment Technologies SA ;
 */

/**
 * @author Jean-Sébastien Conan <jean-sebastien@taotesting.com>
 */
define([
    'lodash',
    'ui/form/widget/definitions'
], function (
    _,
    widgetDefinitions
) {
    'use strict';

    QUnit.module('Definitions');

    QUnit.test('module', function (assert) {
        assert.expect(2);

        assert.equal(typeof widgetDefinitions, 'object', 'The module exposes an object');
        assert.notEqual(_.size(widgetDefinitions), 0, 'The object contains properties');
    });

    QUnit.cases.init([
        {title: 'DEFAULT'},
        {title: 'TEXTBOX'},
        {title: 'TEXTAREA'},
        {title: 'HIDDEN'},
        {title: 'HIDDENBOX'},
        {title: 'RADIOBOX'},
        {title: 'COMBOBOX'},
        {title: 'STATEWIDGET'},
        {title: 'CHECKBOX'}
    ]).test('constant ', function (data, assert) {
        assert.expect(1);
        assert.equal(typeof widgetDefinitions[data.title], 'string', 'The object exposes a "' + data.title + '" constant');
    });
});