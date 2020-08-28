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
import context from 'context';
import layoutTpl from 'ui/searchModal/tpl/layout';
import infoMessageTpl from 'ui/searchModal/tpl/info-message';
import 'ui/searchModal/css/searchModal.css';
import component from 'ui/component';
import 'ui/modal';
import 'ui/datatable';
import store from 'core/store';

/**
 * Creates a searchModal instance
 *
 * @param {object} config
 * @param {object} config.renderTo - DOM element where component will be rendered to
 * @param {string} config.query - search query to be set on component creation
 * @param {boolean} config.searchOnInit - if init search must be triggered or not (stored results are used instead)
 * @param {string} config.url - search endpoint to be set on datatable
 * @param {object} config.events - events hub
 * @returns {searchModal}
 */
export default function searchModalFactory(config) {
    // Private properties to be easily accessible by instance methods
    let searchInput = null;
    let searchButton = null;
    let clearButton = null;
    let running = false;
    let searchStore = null;

    // Create new component
    const instance = component().setTemplate(layoutTpl).on('render', renderModal).on('destroy', destroyModal);

    /**
     * Creates search modal, inits template selectors, inits search store, and once is created triggers initial search
     */
    function renderModal() {
        initModal();
        initUiSelectors();
        initSearchStore().then(function () {
            searchButton.trigger('click');
        });
    }

    /**
     * Removes search modal
     */
    function destroyModal() {
        instance.getElement().removeClass('modal').modal('destroy');
        $('.modal-bg').remove();
    }

    /**
     * Creates search modal
     */
    function initModal() {
        instance
            .getElement()
            .addClass('modal')
            .on('closed.modal', function () {
                instance.destroy();
            })
            .modal({
                disableEscape: true,
                width: $(window).width(),
                minHeight: $(window).height(),
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
     * Loads search store so it is accessible in the component
     */
    function initSearchStore() {
        return store('search').then(function (store) {
            searchStore = store;
        });
    }

    /**
     * Request search results and manages its results
     */
    function search() {
        const query = searchInput.val();

        // if query is empty just clear datatable
        if (query === '') {
            clear();
            return;
        }

        // set query string and context into searchStore and notify it
        searchStore
            .setItem('query', query)
            .then(() => searchStore.setItem('context', context.shownStructure).then(notifySearchStoreUpdate));

        //throttle and control to prevent sending too many requests
        const searchHandler = _.throttle(query => {
            if (running === false) {
                running = true;
                $.ajax({
                    url: config.url,
                    type: 'POST',
                    data: { query: query },
                    dataType: 'json'
                })
                    .done(buildSearchResultsDatatable)
                    .always(function () {
                        running = false;
                    });
            }
        }, 100);

        searchHandler(query);
    }

    /**
     * Creates a datatable with search results
     * @param {object} data - search configuration including model and endpoint for datatable
     */
    function buildSearchResultsDatatable(data) {
        // If no search on init, get dataset from searchStore and recursively recall
        if (config.searchOnInit === false) {
            searchStore.getItem('results').then(storedSearchResults => {
                config.searchOnInit = true;
                data.storedSearchResults = storedSearchResults;
                buildSearchResultsDatatable(data);
            });
            return;
        }

        //update the section container
        const $tableContainer = $('<div class="flex-container-full"></div>');
        const section = $('.content-container', instance.getElement());
        section.empty();
        section.append($tableContainer);
        $tableContainer.on('load.datatable', searchResultsLoaded);

        //create datatable
        $tableContainer.datatable(
            {
                url: data.url,
                model: _.values(data.model),
                labels: {
                    actions: ''
                },
                actions: [
                    {
                        id: 'go-to-item',
                        label: __('Go to item'),
                        action: function openResource(id) {
                            config.events.trigger('refresh', {
                                uri: id
                            });
                            destroyModal();
                        }
                    }
                ],
                params: {
                    params: data.params,
                    filters: data.filters,
                    rows: 20
                }
            },
            data.storedSearchResults
        );
    }

    /**
     * Triggered on load.datatable event, it saves search results
     * on searchStore and manages possible exceptions
     * @param {object} e - load.datatable event
     * @param {object} dataset - datatable dataset
     */
    function searchResultsLoaded(e, dataset) {
        if (dataset.records === 0) {
            searchStore.removeItem('results').then(notifySearchStoreUpdate);
            replaceSearchResultsDatatableWithMessage('no-matches');
        } else {
            searchStore.setItem('results', dataset).then(notifySearchStoreUpdate);
        }
    }

    /**
     * Clear search input and search results from both, view and store
     */
    function clear() {
        searchStore.clear().then(notifySearchStoreUpdate);
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
            message = __('Please define your search in the search panel.');
            icon = 'icon-find';
        } else if (reason === 'no-matches') {
            message = __('No item found. Please try other search criteria.');
            icon = 'icon-info';
        }

        const infoMessage = infoMessageTpl({ message, icon });
        section.append(infoMessage);
    }

    /**
     * Called on every internal store update, it triggers a searchStoreUpdate event so parent containers can react
     */
    function notifySearchStoreUpdate() {
        instance.trigger('searchStoreUpdate');
    }

    // return initialized instance of searchModal
    return instance.init(
        _.defaults(config, {
            renderTo: 'body',
            query: '',
            searchOnInit: true
        })
    );
}
