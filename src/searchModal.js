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
 * Copyright (c) 2020 (original work) Open Assessment Technologies SA ;
 */
import $ from 'jquery';
import _ from 'lodash';
import __ from 'i18n';
import layoutTpl from 'ui/searchModal/tpl/layout';
import 'ui/searchModal/css/searchModal.css';
import component from 'ui/component';
import 'ui/modal';
import 'ui/datatable';

/**
 * Creates a search modal instance
 * @param {object} config - search modal configuration
 * @param {string} config.query - search query to be set and triggered on component creation
 * @param {string} config.url - search endpoint
 * @param {object} config.events - events hub
 */
export default function searchModalFactory(config) {
    const instance = component().setTemplate(layoutTpl);
    let searchInput = null;
    let searchButton = null;
    let clearButton = null;
    let running = false;
    instance.on('render', () => renderModal());
    instance.on('destroy', () => destroyModal());

    /**
     * Creates search modal, inits template selectors, and triggers initial search
     */
    function renderModal() {
        initModal();
        initUiSelectors();
        searchButton.trigger('click');
    }

    /**
     * Removes search modal
     */
    function destroyModal() {
        instance.getElement()
            .removeClass('modal')
            .modal('destroy');
        $('.modal-bg').remove();
    }

    /**
     * Creates search modal
     */
    function initModal() {
        instance
        .getElement()
        .addClass('modal')
        .on('closed.modal', function() {
            instance.destroy();
        })
        .modal({
            disableEscape: true,
            width: $( window ).width(),
            minHeight: $( window ).height(),
            modalCloseClass: 'modal-close-left'
        })
        .focus();
    }

    /**
     * Inits template selectors and sets initial search query on search input
     */
    function initUiSelectors() {
        searchButton = $('.btn-search', instance.getElement());
        clearButton = $('.btn-clear', instance.getElement());
        searchInput = $('.search-bar-container input', instance.getElement());
        searchButton.on('click', search);
        clearButton.on('click', clear);
        searchInput.val(config.query);
    }

    /**
     * Request search results and manages its results
     */
    function search() {
        const query = searchInput.val();
        if (query === '') {
            clear();
            return;
        }
        //throttle and control to prevent sending too many requests
        const searchHandler = _.throttle(function searchHandlerThrottled(query){
            if(running === false){
                running = true;
                $.ajax({
                    url : config.url,
                    type : 'POST',
                    data :  {query : query},
                    dataType : 'json'
                }).done(function(response){
                    if(response && response.result && response.result === true){
                        buildResponseTable(response);
                    } else {
                        // TODO - Manage no results
                        // feedback().warning(__('No results found'));
                    }
                }).complete(function(){
                    running = false;
                });
            }
        }, 100);

        searchHandler(query);
    }

    /**
     * Creates a datatable with search results
     * @param {object} data - search query results
     */
    function buildResponseTable(data){
        //update the section container
        const $tableContainer = $('<div class="flex-container-full"></div>');
        const section = $('.content-container', instance.getElement());
        section.empty();
        section.append($tableContainer);

        //create datatable
        $tableContainer.datatable({
            url: data.url,
            model : _.values(data.model),
            emptyText: "No results were found.",
            actions : {
                open : function openResource(id){
                    config.events.trigger('refresh', {
                        uri: id
                    });
                    destroyModal();
                }
            },
            params : {
                params : data.params,
                filters: data.filters,
                rows: 20
            }
        });
    };

    /**
     * Clear search results and search input
     */
    function clear() {
        const section = $('.content-container', instance.getElement());
        section.empty();
        searchInput.val('');
    }

    return instance.init({renderTo:'body'});
}