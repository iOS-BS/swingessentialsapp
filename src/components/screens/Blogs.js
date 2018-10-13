import React from 'react';
import {connect} from 'react-redux';

import {Text, View, ScrollView, FlatList, RefreshControl, Platform} from 'react-native';
import {Header} from 'react-native-elements';
import styles, {colors, spacing} from '../../styles/index';
import {scale, verticalScale} from '../../styles/dimension';

import {getBlogs} from '../../actions/BlogActions';
import CardRow from '../Card/CardRow';

function mapStateToProps(state){
    return {
        token: state.login.token,
        admin: state.login.admin,
        blogs: state.blogs
    };
}
function mapDispatchToProps(dispatch){
    return {
        getBlogs: (token = null) => dispatch(getBlogs(token))
    };
}

class Blogs extends React.Component{
    constructor(props){
        super(props);
        this.state={
            refreshing: false
        }
    }
    componentWillReceiveProps(nextProps){
        if(!nextProps.blogs.loading){
            this.setState({refreshing: false});
        }
    }

    _onRefresh(){
        this.setState({refreshing: true});
        this.props.getBlogs(this.props.token);
    }

    // returns the blogs list categorized by year
    blogsByYear() {
        return this.props.blogs.blogList.reduce(function(newBlogs, blog) {
            const year = blog.date.split('-',3)[0];
            if (!newBlogs[year]) { newBlogs[year] = []; }
            newBlogs[year].push(blog);
            return newBlogs;
        }, {});
    }

    render(){
        const splitBlogs = this.blogsByYear();
        return(
            <View style={{backgroundColor: colors.backgroundGrey, flexDirection: 'column', flex: 1}}>
                <Header
                    style={{flex: 0}}
                    outerContainerStyles={{ 
                        backgroundColor: colors.lightPurple, 
                        height: verticalScale(Platform.OS === 'ios' ? 70 :  70 - 24), 
                        padding: verticalScale(Platform.OS === 'ios' ? 15 : 10)
                    }}
                    //innerContainerStyles={{alignItems: Platform.OS === 'ios' ? 'flex-end' : 'center'}}
                    leftComponent={{ 
                        icon: 'menu',
                        size: verticalScale(26),
                        underlayColor:colors.transparent, 
                        color: colors.white, 
                        containerStyle:styles.headerIcon, 
                        onPress: () => this.props.navigation.navigate('DrawerOpen') 
                    }}
                    centerComponent={{ text: 'The 19th Hole', style: { color: colors.white, fontSize: verticalScale(18) } }}
                    //rightComponent={{ icon: 'settings',underlayColor:colors.transparent, color: colors.white, containerStyle:styles.headerIcon, 
                    //   onPress: () => {this.props.navigation.push('Settings')}}}
                />
                <ScrollView 
                    contentContainerStyle={{padding: spacing.normal, alignItems: 'stretch'}}
                    refreshControl={<RefreshControl refreshing={this.state.refreshing} onRefresh={()=>this._onRefresh()}/>}
                >
                    {Object.keys(splitBlogs).sort().reverse().map((year, index) =>
                        <FlatList
                            key={'yearList_'+year}
                            style={{marginTop: index === 0 ? 0 : spacing.normal}}
                            // style={{marginTop: spacing.normal}}
                            scrollEnabled= {false}
                            ListHeaderComponent={
                                <View style={styles.cardHeader}>
                                    <Text style={{fontSize: scale(14), color: colors.white}}>{year}</Text>
                                </View>
                            }
                            data={splitBlogs[year]}
                            ListEmptyComponent={!this.props.blogs.loading ?
                                <CardRow primary={'No Posts'}/>
                                :<CardRow primary={'Loading Posts...'}/>
                            }
                            renderItem={({item}) => 
                                <CardRow 
                                    primary={item.title} 
                                    action={() => this.props.navigation.push('Blog', {blog: item})}
                                />
                            }
                            keyExtractor={(item, index) => item.id}
                        />
                    )}
                    
                </ScrollView>                
            </View>

        );
    }
};

export default connect(mapStateToProps, mapDispatchToProps)(Blogs);