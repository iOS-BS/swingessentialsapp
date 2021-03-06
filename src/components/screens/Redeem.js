import React from 'react';
import {connect} from 'react-redux';

import {ActivityIndicator, Keyboard, Alert, Image, Text, Platform, TouchableOpacity, View, ScrollView, StyleSheet} from 'react-native';
import styles, {sizes, colors, spacing} from '../../styles/index';
import {scale} from '../../styles/dimension';

import Header from '../Header/Header';
import {FormInput, Button, Icon} from 'react-native-elements';
import {redeemCredit} from '../../actions/LessonActions';

import Tutorial from '../Tutorial/Redeem';
import {TUTORIALS} from '../../constants/index';
import { tutorialViewed } from '../../actions/TutorialActions';

import {checkToken} from '../../actions/LoginActions';
import KeyboardView from '../Keyboard/KeyboardView';
import Video from 'react-native-video';

var ImagePicker = require('react-native-image-picker');

import {atob} from '../../utils/base64';

import downtheline from '../../images/downtheline.png';
import faceon from '../../images/faceon.png';

function mapStateToProps(state){
    return {
        token: state.login.token,
        credits: state.credits,
        lessons: state.lessons.pending,
        redeemPending: state.lessons.redeemPending,
        redeemSuccess: state.lessons.redeemSuccess,
        showTutorial: state.tutorial[TUTORIALS.SUBMIT_SWING]
    };
}
function mapDispatchToProps(dispatch){
    return {
        redeemCredit: (data, token, onProgress) => {dispatch(redeemCredit(data, token, onProgress))},
        checkToken: (token) => {dispatch(checkToken(token))},
        closeTutorial: () => {dispatch(tutorialViewed(TUTORIALS.SUBMIT_SWING))}
    };
}

class Redeem extends React.Component{
    constructor(props){
        super(props);
        this.state={
            foSource: null,
            dtlSource: null,
            foPlaying: false,
            dtlPlaying: false,
            notes: '',
            progress: 0,
            role: 'pending',
            error: ''
        }
    }
    componentWillMount(){
        this._updateUserRole(this.props.token);
        if(this.props.lessons.length > 0){
            Alert.alert(
                'Swing Analysis Pending',
                'You already have a swing analysis in progress. Please wait for that analysis to finish before submitting a new swing. We guarantee a 48-hour turnaround on all lessons.',
                [{text: 'OK'}]
            );
            this.props.navigation.navigate('Lessons');
        }
    }

    componentWillReceiveProps(nextProps){
        // If we get a new token, update the user role
        if(nextProps.token !== this.props.token){
            this._updateUserRole(nextProps.token);
        }

        if(nextProps.redeemSuccess && !this.props.redeemSuccess){
            Alert.alert(
                'Success!',
                'Your lesson request was submitted successfully. We are working on your analysis.',
                [{text: 'OK'}]
            );
            this.props.navigation.navigate('Lessons');
        }
        else if(nextProps.token && !nextProps.credits.inProgress && nextProps.credits.count < 1 && nextProps.credits.unlimitedExpires < Date.now()/1000){
            this.setState({error: 'Looks like you\'re all out of lesson credits. Head to the Order page to stock up.'})
        }
        else if(nextProps.lessons.length > 0 && !nextProps.redeemSuccess){
            Alert.alert(
                'Swing Analysis Pending',
                'You already have a swing analysis in progress. Please wait for that analysis to finish before submitting a new swing. We guarantee a 48-hour turnaround on all lessons.',
                [{text: 'OK'}]
            );
            this.props.navigation.navigate('Lessons')
        }
        else if(this.props.redeemPending && !nextProps.redeemPending && !nextProps.redeemSuccess){
            Alert.alert(
                'Oops',
                'There was an unexpected error while submitting your swing videos. Please try again later or contact us if the problem persists.',
                [
                    {text: 'Back to Lessons', onPress: () => this.props.navigation.navigate('Lessons')}
                ],
                {onDismiss: () => this.props.navigation.navigate('Lessons')}
            );
        }
        else{
            this.setState({error: ''})
        }
    }

    _updateUserRole(token){
        if(!token){
            // this.props.navigation.navigate('Auth');
            this.setState({role: 'anonymous', error: 'You must be signed in to submit swing videos for analysis.'});
            if(this.tokenCheckTimer){clearInterval(this.tokenCheckTimer);}
        }
        else{
            const role = JSON.parse(atob(token.split('.')[1])).role;
            if(role === 'pending'){
                this.tokenCheckTimer = setInterval(()=>{this.props.checkToken(token)}, 1000*60);
                this.setState({role: 'pending', error: 'You must verify your email address before you can submit lessons.'});
            }
            else{
                this.setState({role: role, error: ''});
                if(this.tokenCheckTimer){clearInterval(this.tokenCheckTimer);}
            }
       }   
    }

    // Shows the picker option for recording a new swing video or choosing one from the library
    _showPicker(swing){
        ImagePicker.showImagePicker(
            {
                title: null,//'Select a Swing Video',
                takePhotoButtonTitle: null,//'Record a New Video',
                chooseFromLibraryButtonTitle: 'Choose From Library',
                customButtons: [
                    {name: 'record', title: 'Record a New Video'},
                ],
                videoQuality: 'high',//'low',
                mediaType: 'video',//video
                durationLimit: 10,
                storageOptions: {
                    skipBackup: true,
                    path: 'images'
                }
            }, 
            (response) => {
           
                if (response.didCancel) {
                    //do nothing
                }
                else if (response.error) {
                    alert('There was an error choosing a video. Try again later.');//response.error
                }
                else if (response.customButton === 'record') {
                    this.props.navigation.push('Record', 
                        {swing: swing === 'foSource' ? 'fo':'dtl', 
                        returnFunc: (uri)=>{
                            this.setState({
                                [swing]: {uri: uri}
                            });
                        }}
                    );
                  }
                else {
                    this.setState({
                        [swing]: { uri: response.uri }
                    });
                }
            }
        );
    }

    _redeemLesson(){
        Keyboard.dismiss();
        if(this.props.redeemPending || 
            this.state.error !== ''){ 
                return;
        }
        if((!this.foplayer || !this.dtlplayer)){
            return;
        }
        if(!this.state.foSource || !this.state.dtlSource){
            this.setState({error: 'Missing Required Videos'});
            return;
        }

        let data = new FormData();
        data.append('fo', {
            name: 'fo.mov', 
            uri: this.state.foSource.uri, 
            type:(Platform.OS === 'android' ? 'video/mp4' :'video/mov')
        });
        data.append('dtl', {
            name: 'dtl.mov', 
            uri: this.state.dtlSource.uri, 
            type:(Platform.OS === 'android' ? 'video/mp4' :'video/mov')
        });
        data.append('notes', this.state.notes);

        this.props.redeemCredit(data, this.props.token, this._updateProgress.bind(this));
        // this.scroller.scrollTo({x: 0, y: 0, animated: true});
    }

    _updateProgress(event){
        this.setState({progress: (event.loaded/event.total)*100});
    }

    render(){
        return(
            <View style={{backgroundColor: colors.backgroundGrey, flexDirection: 'column', flex: 1}}>
                <Header title={'Submit Your Swing'} navigation={this.props.navigation}/>
                <KeyboardView
                    fixed={ (!this.props.redeemPending) ?
                        <Button
                            title="SUBMIT"
                            fontSize={scale(14)}
                            disabled={this.props.redeemPending || 
                                this.state.error !== '' ||
                                !this.state.foSource || 
                                !this.state.dtlSource
                            }
                            disabledStyle={styles.disabledButton}
                            onPress={()=>this._redeemLesson()}
                            buttonStyle={StyleSheet.flatten([styles.purpleButton, {marginTop: spacing.normal}])}
                            containerViewStyle={styles.buttonContainer}
                        />
                        :
                        <View style={{paddingTop: spacing.normal}}>
                            <ActivityIndicator color={colors.purple}/>
                            <Text style={{fontSize: scale(14), marginTop: spacing.tiny, color: colors.purple, textAlign: 'center', width: '100%'}}>
                                {this.state.progress < 100 ?
                                    ('Uploading Video Files... ' + this.state.progress.toFixed(2)+'%')
                                    : 'Creating lesson...'
                                }
                            </Text>
                        </View>
                    }
                >
                    <ScrollView 
                        ref={(ref) => this.scroller = ref}
                        //keyboardShouldPersistTaps={'always'}
                        >
                        {this.state.error !== '' && 
                            <Text style={StyleSheet.flatten([styles.formValidation, {marginBottom: spacing.normal}])}> 
                                {this.state.error}
                            </Text>
                        }
                        <Text style={styles.formLabel}>Your Swing Videos</Text>
                        <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.small}}>
                            <View style={{flex: 1, marginRight: spacing.normal}}>
                                <View style={{flex: 0, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.purple, backgroundColor: this.state.foSource ? colors.black: colors.white, height: sizes.large}}>
                                    {this.state.foSource &&
                                        <TouchableOpacity style={{height:'100%', width: '100%'}} 
                                            underlayColor={colors.black}
                                            onPress={()=>this.setState({foPlaying: !this.state.foPlaying})}> 
                                            <View style={StyleSheet.flatten([styles.absolute, styles.centered])}>
                                                <Icon 
                                                    name={'play-arrow'} 
                                                    size={sizes.medium} 
                                                    color={colors.white}
                                                    underlayColor={colors.transparent}
                                                />
                                            </View>
                                            <Video source={this.state.foSource}    // Can be a URL or a local file.
                                                //poster="https://baconmockup.com/300/200/" // uri to an image to display until the video plays
                                                ref={(ref) => {
                                                    this.foplayer = ref
                                                }}                                      // Store reference
                                                rate={1.0}                              // 0 is paused, 1 is normal.
                                                volume={1.0}                            // 0 is muted, 1 is normal.
                                                muted={false}                           // Mutes the audio entirely.
                                                paused={!this.state.foPlaying}                          // Pauses playback entirely.
                                                onEnd={()=>this.setState({foPlaying: false})}
                                                resizeMode="contain"                    // Fill the whole screen at aspect ratio.*
                                                repeat={false}                           // Repeat forever.
                                                playInBackground={false}                // Audio continues to play when app entering background.
                                                playWhenInactive={false}                // [iOS] Video continues to play when control or notification center are shown.
                                                ignoreSilentSwitch={"ignore"}           // [iOS] ignore | obey - When 'ignore', audio will still play with the iOS hard silent switch set to silent. When 'obey', audio will toggle with the switch. When not specified, will inherit audio settings as usual.
                                                style={{height:'100%', width: '100%'}}
                                            />
                                        </TouchableOpacity>    
                                    }
                                    {!this.state.foSource  && 
                                        <TouchableOpacity style={{height:'100%', width: '100%'}} 
                                            onPress={()=>this._showPicker('foSource')}> 
                                            <Image
                                                resizeMethod='resize'
                                                style={{height:'100%', width: '100%', resizeMode: 'contain'}}
                                                source={faceon}
                                            />
                                            {/* {Platform.OS === 'android' && this.state.foSource &&
                                                <Icon 
                                                    containerStyle={{position: 'absolute', bottom: spacing.tiny, left: spacing.tiny}}
                                                    name={'check-circle'} 
                                                    size={sizes.normal} 
                                                    color={'#4caf50'}
                                                />
                                            } */}
                                        </TouchableOpacity>
                                    }
                                </View>
                                <Button
                                    containerViewStyle={{flex: 0}}
                                    onPress={() => this._showPicker('foSource')}
                                    title={'Face-On'}
                                    fontSize={scale(14)}
                                    icon={{name: 'camera-alt', color: colors.purple, size: scale(14)}}
                                    backgroundColor={colors.transparent}
                                    textStyle={{color: colors.purple}}
                                />
                            </View>
                            <View style={{flex: 1}}>
                                <View style={{flex: 0, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.purple, backgroundColor: this.state.dtlSource ? colors.black : colors.white, height: sizes.large}}>
                                    {this.state.dtlSource &&
                                        <TouchableOpacity style={{height:'100%', width: '100%'}} 
                                            underlayColor={colors.black}
                                            onPress={()=>this.setState({dtlPlaying: !this.state.dtlPlaying})}> 
                                            <View style={StyleSheet.flatten([styles.absolute, styles.centered])}>
                                                <Icon 
                                                    name={'play-arrow'} 
                                                    size={sizes.medium} 
                                                    color={colors.white}
                                                    underlayColor={colors.transparent}
                                                />
                                            </View>
                                            <Video source={this.state.dtlSource}    // Can be a URL or a local file.
                                                //poster="https://baconmockup.com/300/200/" // uri to an image to display until the video plays
                                                ref={(ref) => {
                                                    this.dtlplayer = ref
                                                }}                                      // Store reference
                                                rate={1.0}                              // 0 is paused, 1 is normal.
                                                volume={1.0}                            // 0 is muted, 1 is normal.
                                                muted={false}                           // Mutes the audio entirely.
                                                paused={!this.state.dtlPlaying}                          // Pauses playback entirely.
                                                onEnd={()=>this.setState({dtlPlaying: false})}
                                                resizeMode="contain"                    // Fill the whole screen at aspect ratio.*
                                                repeat={false}                           // Repeat forever.
                                                playInBackground={false}                // Audio continues to play when app entering background.
                                                playWhenInactive={false}                // [iOS] Video continues to play when control or notification center are shown.
                                                ignoreSilentSwitch={"ignore"}           // [iOS] ignore | obey - When 'ignore', audio will still play with the iOS hard silent switch set to silent. When 'obey', audio will toggle with the switch. When not specified, will inherit audio settings as usual.
                                                style={{height:'100%', width: '100%'}}
                                            />
                                        </TouchableOpacity>    
                                    }
                                    {!this.state.dtlSource && 
                                        <TouchableOpacity style={{height:'100%', width: '100%'}} 
                                            onPress={()=>this._showPicker('dtlSource')}> 
                                            <Image
                                                resizeMethod='resize'
                                                style={{height:'100%', width: '100%', resizeMode: 'contain'}}
                                                source={downtheline}
                                            />
                                            {/* {Platform.OS === 'android' && this.state.dtlSource &&
                                                <Icon 
                                                    containerStyle={{position: 'absolute', bottom: spacing.tiny, left: spacing.tiny}}
                                                    name={'check-circle'} 
                                                    size={sizes.normal} 
                                                    color={'#4caf50'}
                                                />
                                            } */}
                                        </TouchableOpacity>
                                    }
                                </View>
                                <Button
                                    containerViewStyle={{flex: 0}}
                                    onPress={() => this._showPicker('dtlSource')}
                                    title={'Down-the-Line'}
                                    fontSize={scale(14)}
                                    icon={{name: 'camera-alt', color: colors.purple, size: scale(14)}}
                                    textStyle={{color: colors.purple}}
                                    backgroundColor={colors.transparent}
                                />
                            </View>
                        </View>
                        <Text style={StyleSheet.flatten([styles.formLabel, {marginTop: spacing.normal}])}>
                            Special Requests
                        </Text>
                        <FormInput
                            autoCapitalize={'sentences'}
                            multiline={true}
                            returnKeyType={'done'}
                            blurOnSubmit={true}
                            containerStyle={StyleSheet.flatten([styles.formInputContainer, {height: sizes.large, marginTop: spacing.small}])}
                            inputStyle={StyleSheet.flatten([styles.formInput, {textAlignVertical: 'top'}])}
                            underlineColorAndroid={colors.transparent}
                            onFocus={() => this.scroller.scrollTo({x: 0, y: 150, animated: true})}
                            value={this.state.notes}
                            editable={!this.props.redeemPending}
                            maxLength={500}
                            //keyboardType={item.property==='email'?'email-address':'default'}
                            //secureTextEntry={item.property==='password' || item.property ==='passwordConfirm'}
                            onChangeText={(val)=>this.setState({notes: val})}
                            //onBlur={item.blur}
                        />
                        <Text color={colors.purple} style={{textAlign: 'right'}}>{`${500 - this.state.notes.length} Characters Left`}</Text>
                    </ScrollView>    
                    <Tutorial isVisible={this.props.showTutorial} close={()=>this.props.closeTutorial()}/>       
                </KeyboardView> 
            </View>

        );
    }
};

export default connect(mapStateToProps, mapDispatchToProps)(Redeem);