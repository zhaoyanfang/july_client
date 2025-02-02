// pages/profile/index.js
import { Paging } from "../../utils/paging"
const app = getApp()
const api = app.api
const wxutil = app.wxutil

Page({
  data: {
    user: null,
    topics: [],
    comments: [],
    stars: [],
    tabIndex: 0,  // Tabs选中的栏目
    tabsTop: 300, // Tabs距离顶部的高度
    showImageClipper: false, // 是否显示图片裁剪器
    messageBrief: null, // 动态消息概要
    tmpAvatar: null, // 头像临时文件
    topicPaging: null,  // 话题分页器
    commentPaging: null,  // 评论分页器
    starPaging: null, // 收藏分页器
    hasMoreTopic: true, // 是否还有更多话题
    hasMoreComment: true, // 是否还有更多评论
    hasMoreStar: true, // 是否还有更多收藏
    tabsFixed: false, // Tabs是否吸顶
    loading: false
  },

  onLoad() {
    this.getUserInfo()
  },

  onShow() {
    this.getUserInfo(false)
    this.getMessageBrief()
  },

  /**
   * 计算Tabs距离顶部的高度
   */
  getTabsTop() {
    const query = wx.createSelectorQuery()
    query.select("#tabs").boundingClientRect((res) => {
      this.setData({
        tabsTop: res.top
      })
    }).exec()
  },

  /**
   * 获取用户信息
   */
  getUserInfo(loadPage = true) {
    let userDetail = app.globalData.userDetail
    if (!userDetail) {
      this.setData({
        user: null,
        topics: [],
        comments: [],
        stars: []
      })
      return
    }

    const userId = userDetail.id
    wxutil.request.get(api.userAPI + userId + "/").then((res) => {
      if (res.code === 200) {
        // 更新缓存
        userDetail = Object.assign(userDetail, res.data)
        wxutil.setStorage("userDetail", userDetail)
        app.globalData.userDetail = userDetail
        this.setData({
          user: userDetail
        })

        if (loadPage) {
          this.getTabsTop()
          wx.setNavigationBarTitle({
            title: userDetail.nick_name
          })
        }

        this.initTopics(userId)
        this.initComments(userId)
        this.initStars(userId)
      }
    })
  },

  /**
   * 初始化话题
   */
  async initTopics(userId) {
    const topicPaging = new Paging(api.topicAPI + "user/" + userId + "/")
    this.setData({
      topicPaging: topicPaging
    })
    await this.getMoreTopics(topicPaging)
  },

  /**
   * 获取更多话题
   */
  async getMoreTopics(topicPaging) {
    const data = await topicPaging.getMore()
    if (!data) {
      return
    }
    this.setData({
      topics: data.accumulator,
      hasMoreTopic: data.hasMore
    })
  },

  /**
   * 初始化评论
   */
  async initComments(userId) {
    const commentPaging = new Paging(api.commentAPI + "user/" + userId + "/")
    this.setData({
      commentPaging: commentPaging
    })
    await this.getMoreComments(commentPaging)
  },

  /**
   * 获取更多评论
   */
  async getMoreComments(commentPaging) {
    const data = await commentPaging.getMore()
    if (!data) {
      return
    }
    this.setData({
      comments: data.accumulator,
      hasMoreComment: data.hasMore
    })
  },

  /**
   * 初始化用户收藏
   */
  async initStars(userId) {
    const starPaging = new Paging(api.starAPI + "user/" + userId + "/")
    this.setData({
      starPaging: starPaging
    })
    await this.getMoreStars(starPaging)
  },

  /**
   * 获取更多收藏
   */
  async getMoreStars(starPaging) {
    const data = await starPaging.getMore()
    if (!data) {
      return
    }
    this.setData({
      stars: data.accumulator,
      hasMoreStar: data.hasMore
    })
  },

  /**
   * 获取消息概要并标红点
   */
  getMessageBrief() {
    if (!app.globalData.userDetail) {
      return
    }
    wxutil.request.get(api.messageAPI + "brief/").then((res) => {
      if (res.code === 200) {
        if (res.data.count > 0) {
          this.setData({
            messageBrief: res.data
          })
          wx.setTabBarBadge({
            index: 2,
            text: res.data.count.toString()
          })
        } else {
          this.setData({
            messageBrief: null
          })
          wx.removeTabBarBadge({
            index: 2
          })
        }
      }
    })
  },

  /**
   * Tab切换
   */
  changeTabs(event) {
    const tabIndex = event.detail.currentIndex
    this.setData({
      tabIndex: tabIndex
    })
    if (this.data.tabsFixed) {
      wx.pageScrollTo({
        scrollTop: this.data.tabsTop
      })
    }
  },

  /**
   * 跳转消息页
   */
  gotoMessage() {
    wx.navigateTo({
      url: "/pages/message/index"
    })
  },

  /**
   * 修改封面
   */
  changePoster() {
    if (!this.data.user) {
      return
    }
    wx.lin.showMessage({
      content: "设置封面图片"
    })

    // 上传封面
    wxutil.image.choose(1).then((res) => {
      if (res.errMsg === "chooseImage:ok") {
        wxutil.showLoading("上传中...")

        wxutil.file.upload({
          url: api.userAPI + "poster/",
          fileKey: "file",
          filePath: res.tempFilePaths[0]
        }).then((res) => {
          wx.hideLoading()
          const data = JSON.parse(res.data);
          if (data.code === 200) {
            // 更新缓存
            const user = data.data
            let userDetail = app.globalData.userDetail
            userDetail = Object.assign(userDetail, user)
            wxutil.setStorage("userDetail", userDetail)
            app.globalData.userDetail = userDetail

            this.setData({
              user: user
            })
            wx.lin.showMessage({
              type: "success",
              content: "封面修改成功！"
            })
          } else {
            wx.lin.showMessage({
              type: "error",
              content: "封面修改失败！"
            })
          }
        })
      }
    })
  },

  /**
   * 修改头像
   */
  changeAvatar() {
    if (!this.data.user) {
      return
    }
    wx.lin.showMessage({
      content: "设置头像图片"
    })
    wxutil.image.choose(1).then((res) => {
      if (res.errMsg === "chooseImage:ok") {
        this.setData({
          tmpAvatar: res.tempFilePaths[0],
          showImageClipper: true
        })
      }
    })
  },

  /**
   * 头像裁剪上传
   */
  onClipTap(event) {
    wxutil.file.upload({
      url: api.userAPI + "avatar/",
      fileKey: "file",
      filePath: event.detail.url
    }).then((res) => {
      const data = JSON.parse(res.data)
      if (data.code === 200) {
        // 更新缓存
        const user = data.data
        let userDetail = app.globalData.userDetail
        userDetail = Object.assign(userDetail, user)
        wxutil.setStorage("userDetail", userDetail)
        app.globalData.userDetail = userDetail

        this.setData({
          showImageClipper: false,
          user: user
        })
        wx.lin.showMessage({
          type: "success",
          content: "头像修改成功！"
        })
      } else {
        wx.lin.showMessage({
          type: "error",
          content: "头像修改失败！"
        })
      }
    })
  },

  /**
   * 触底加载
   */
  async onReachBottom() {
    const tabIndex = this.data.tabIndex
    this.setData({
      loading: true
    })
    if (tabIndex === 0) {
      await this.getMoreTopics(this.data.topicPaging)
    }
    else if (tabIndex === 1) {
      await this.getMoreComments(this.data.commentPaging)
    }
    else if (tabIndex === 2) {
      await this.getMoreStars(this.data.starPaging)
    }
    this.setData({
      loading: false
    })
  },

  /**
   * 删除话题
   */
  deleteTopic(event) {
    const dialog = this.selectComponent('#dialog')

    dialog.linShow({
      type: "confirm",
      title: "提示",
      content: "确定要删除该话题？",
      success: (res) => {
        if (res.confirm) {
          const topics = this.data.topics
          const index = event.detail.index

          wxutil.request.delete(api.topicAPI + topics[index].id + "/").then((res) => {
            if (res.code === 200) {
              topics.splice(index, 1)
              this.setData({
                topics: topics
              })

              wx.lin.showMessage({
                type: "success",
                content: "删除成功！"
              })
            } else {
              wx.lin.showMessage({
                type: "error",
                content: "删除失败！"
              })
            }
          })
        }
      }
    })
  },

  /**
   * 删除评论
   */
  deleteComment(event) {
    const dialog = this.selectComponent('#dialog')

    dialog.linShow({
      type: "confirm",
      title: "提示",
      content: "确定要删除该评论？",
      success: (res) => {
        if (res.confirm) {
          const comments = this.data.comments
          const index = event.detail.index

          wxutil.request.delete(api.commentAPI + comments[index].id + "/").then((res) => {
            if (res.code === 200) {
              comments.splice(index, 1)
              this.setData({
                comments: comments
              })

              wx.lin.showMessage({
                type: "success",
                content: "删除成功！"
              })
            } else {
              wx.lin.showMessage({
                type: "error",
                content: "删除失败！"
              })
            }
          })
        }
      }
    })
  },

  /**
   * 取消收藏
   */
  deleteStar(event) {
    const dialog = this.selectComponent('#dialog')

    dialog.linShow({
      type: "confirm",
      title: "提示",
      content: "确定要取消收藏该话题？",
      success: (res) => {
        if (res.confirm) {
          const stars = this.data.stars
          const index = event.detail.index

          wxutil.request.post(api.starAPI, { topic_id: stars[index].topic.id }).then((res) => {
            if (res.code === 200) {
              stars.splice(index, 1)
              this.setData({
                stars: stars
              })

              wx.lin.showMessage({
                type: "success",
                content: "取消成功！"
              })
            } else {
              wx.lin.showMessage({
                type: "error",
                content: "取消失败！"
              })
            }
          })
        }
      }
    })
  },

  onPageScroll(event) {
    if (event.scrollTop >= this.data.tabsTop) {
      this.setData({
        tabsFixed: true
      })
    } else {
      this.setData({
        tabsFixed: false
      })
    }
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.getUserInfo(false)
    this.getMessageBrief()
    wx.stopPullDownRefresh()
    wx.vibrateShort()
  },

  onShareAppMessage() {
    return {
      title: "个人中心",
      path: "/pages/profile/index"
    }
  }
})