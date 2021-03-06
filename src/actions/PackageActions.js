/* Constants */
import {BASEURL, AUTH, failure, success, checkTimeout} from './actions.js';
import { logLocalError } from '../utils/utils.js';

export const GET_PACKAGES = {REQUEST: 'GET_PACKAGES', SUCCESS: 'GET_PACKAGES_SUCCESS', FAIL: 'GET_PACKAGES_FAIL'};

/* Retrieves List of available lesson packages and prices */
export function getPackages(token = null){
    return (dispatch) => {
        dispatch({type:GET_PACKAGES.REQUEST});

        return fetch(BASEURL+'packages')
        .then((response) => {
            switch(response.status) {
                case 200:
                    response.json()
                    .then((json) => dispatch(success(GET_PACKAGES.SUCCESS, json)));
                    //.then((response) => localStorage.setItem('packages',JSON.stringify(response.data)));                    
                    break;
                default:
                    checkTimeout(response, dispatch);
                    dispatch(failure(GET_PACKAGES.FAIL, response));
                    break;
            }
        })
        .catch((error) => {
            logLocalError('117: Promise Error: getting packages');
        });
    }
}