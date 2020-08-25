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
import store from 'core/store';

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
    let searchStore = null;

    instance.on('render', () => renderModal());
    instance.on('destroy', () => destroyModal());

    /**
     * Creates search modal, inits template selectors, inits search store, and once is created triggers initial search
     */
    function renderModal() {
        initModal();
        initUiSelectors();
        initSearchStore().then(function(){
            searchButton.trigger('click');
        });
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
     * Loads search store so it is accessible in the component
     */
    function initSearchStore() {
        return store('search').then(function(store) {
            debugger;
            searchStore = store;
        });
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
        debugger;
        const query = searchInput.val();
        searchStore.setItem('query', query);
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
                }).done(buildSearchResultsDatatable).complete(function(){
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
    function buildSearchResultsDatatable(data){
        //update the section container
        const $tableContainer = $('<div class="flex-container-full"></div>');
        const section = $('.content-container', instance.getElement());

        section.empty();
        section.append($tableContainer);
        $tableContainer.on('load.datatable', searchResultsLoaded);

        //create datatable
        $tableContainer.datatable({
            url: data.url,
            model : _.values(data.model),
            emptyText: "No results were found.",
            labels: {
                actions: ''
            },
            actions : {
                open : {
                    label: 'Go to item',
                    id: 'go-to-item',
                    action: function openResource(id){
                        config.events.trigger('refresh', {
                            uri: id
                        });
                        destroyModal();
                    }
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
     * Saves search results on searchStore and manage possible exceptions
     * @param {object} e - load.datatable event
     * @param {object} dataset - datatable dataset
     */
    function searchResultsLoaded(e, dataset) {
        if (dataset.records === 0) {
            searchStore.removeItem('results');
            replaceSearchResultsDatatableWithMessage('no-matches');
        } else {
            searchStore.setItem('results', dataset.data);
        }
    }

    /**
     * Clear search input and search results
     */
    function clear() {
        searchStore.removeItem('query');
        searchStore.removeItem('results');
        searchInput.val('');
        replaceSearchResultsDatatableWithMessage('no-query');
    }

    /**
     * Removes datatable container and displays a message instead
     * @param {string} reason - reason why datatable is not rendered, to display appropiate message
     */
    function replaceSearchResultsDatatableWithMessage(reason) {
        const section = $('.content-container', instance.getElement());
        section.empty();
        let message = '';
        let icon = '';

        if (reason === 'no-query') {
            message = 'Please define your search in the search panel.';
            icon = 'icon-find';

        } else if (reason === 'no-matches') {
            message = 'No item found. Please try other search criteria.';
            icon = 'icon-info';
        }

        section.append(`
        <div class='no-datatable-container'>
            <span class="no-datatable-icon ${icon}"></span>
            <p class="no-datatable-message">${message}</p>
        </div>`);
    }

    return instance.init({renderTo:'body'});
}