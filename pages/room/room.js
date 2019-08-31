// pages/room.js
const constant = require('../../utils/constant.js')
const app = getApp()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    // 是否连接上服务器
    connected: false,
    // 游戏是否开始
    gameStarted: false,
    // 麻将里的金
    jin: {},
    // 现在是否处于点击吃的状态
    isChi: false,
    // 吃的状态下可以点的牌数组
    canChiArray: [],
    // 现在是否处于点击杠的状态
    isGang: false,
    // 当前用户是否可以抢金
    canQiangJin: false,
    // 当前轮到哪个用户出牌
    currentUserName: '',
    // 按照出牌顺序下一个出牌的用户（如果没有碰杠胡时，就是当前用户，有碰杠胡时，记录按照顺序的下一个用户）
    physicalNextUserName: '',
     // 庄家名称
    bankerName: '',
    // 当前摸入的麻将id，用于在界面上和其它麻将分开（体现是刚摸入的）
    currentInMajiangId: -1,
    // 当前打出的麻将
    currentOutMajiang: {},
    // 剩余麻将数
    remainMajiangNum: 128,
    // 四个方向的用户名称
    topUserName: '',
    leftUserName: '',
    rightUserName: '',
    bottomUserName: '',
    // 四个方向的用户分数
    topUserScore: '',
    leftUserScore: '',
    rightUserScore: '',
    bottomUserScore: '',
    // 四个方向的用户手牌数组
    mjTopArray: [],
    mjLeftArray: [],
    mjRightArray: [],
    mjBottomArray: [],
    // 四个方向的用户的花+打出的牌数组
    mjTopOutArray: [],
    mjLeftOutArray: [],
    mjRightOutArray: [],
    mjBottomOutArray: []
  },

  /**
   * 麻将子选中操作
   */
  handleChoose: function(e) {
    const mj = this.data.mjBottomArray[e.currentTarget.dataset.index]
    if (mj.show || mj.anGang || mj.jin) {
      // 已经吃、碰、杠的牌和金不能打
      return
    }

    if (this.data.isChi) {
      // 吃牌时的选牌操作
      if (this.data.canChiArray.filter(code => code === mj.code).length === 0) {
        return
      }
      const mjBottomArray = this.data.mjBottomArray.map((item, index) => {
        if (e.currentTarget.dataset.index == index) {
          item.top = item.top === '-10px' ? 0 : '-10px'
        }
        return item
      })
      const chiArray = mjBottomArray.filter(mj => mj.top !== 0)
      
      if (chiArray.length === 2) {
        // 如果有两张牌被选中，且符合吃的规则，则直接吃
        const chiArr = [chiArray[0], chiArray[1], this.data.currentOutMajiang]
        chiArr.sort((a, b) => a.code - b.code)
        if (chiArr[1].code === chiArr[0].code + 1 && chiArr[1].code === chiArr[2].code - 1) {
          wx.sendSocketMessage({
            data: JSON.stringify({
              type: constant.MJ_CHI,
              message: `${chiArr[0].id} ${chiArr[1].id} ${chiArr[2].id}`
            })
          })
          this.setData({
            isChi: false,
            chiArray: [],
            mjBottomArray
          })
        } else {
          this.setData({
            chiArray: [],
            mjBottomArray
          })
        }
      } else {
        // 有一张牌被选中，则显示，等待下一张牌
        this.setData({
          mjBottomArray
        })
      }
    } else if (this.data.isGang) {
      // 杠牌时的选中操作
      if (this.data.mjBottomArray.filter(item => item.show && item.code === mj.code).length === 3) {
        // 说明是加杠
        wx.sendSocketMessage({
          data: JSON.stringify({
            type: constant.MJ_JIA_GANG,
            message: mj.code
          })
        })
      } else if (this.data.mjBottomArray.filter(item => item.code === mj.code).length === 4) {
        // 说明是暗杠
        wx.sendSocketMessage({
          data: JSON.stringify({
            type: constant.MJ_AN_GANG,
            message: mj.code
          })
        })
      } else {
        wx.showToast({
          title: '选择的牌不能开杠，已取消杠操作',
          icon: 'none'
        })
      }
      this.setData({ isGang: false })
    } else {
      // 正常选牌出牌操作
      if (this.data.currentUserName === app.globalData.userInfo.nickName && mj.top !== 0) {
        // 说明是打掉这张牌的操作
        if (this.data.mjBottomArray.filter(mj => !mj.show && !mj.anGang).length % 3 !== 2) {
          wx.showToast({
            title: '请先摸牌后再出牌',
            icon: 'none'
          })
          return
        }
        wx.sendSocketMessage({
          data: JSON.stringify({
            type: constant.MJ_OUT,
            message: e.currentTarget.dataset.index
          })
        })
        return
      }
      // 说明是点击了别的牌的操作
      const mjBottomArray = this.data.mjBottomArray.map((item, index) => {
        if (e.currentTarget.dataset.index == index) {
          item.top = item.top === 0 ? '-10px' : 0
        } else {
          item.top = 0
        }
        return item
      })
      this.setData({
        mjBottomArray
      })
    }
  },

  /**
   * 摸牌操作
   */
  handleAdd() {
    if (this.data.currentUserName !== this.data.physicalNextUserName) {
      wx.showToast({
        title: '没轮到你摸牌',
        icon: 'none'
      })
      return false
    }
    if (this.data.currentUserName === app.globalData.userInfo.nickName) {
      if (this.data.mjBottomArray.filter(mj => !mj.show && !mj.anGang).length % 3 === 2) {
        wx.showToast({
          title: '牌数正好，不能摸牌',
          icon: 'none'
        })
      } else {
        wx.sendSocketMessage({
          data: JSON.stringify({
            type: constant.MJ_IN,
            message: '请求摸牌'
          })
        })
        this.setData({
          isChi: false,
          canChiArray: [],
          isGang: false
        })
      }
    } else {
      wx.showToast({
        title: '轮到你了才能摸牌哦！',
        icon: 'none'
      })
    }
  },

  /**
   * 吃牌操作
   */
  handleChi() {
    if (this.data.currentUserName !== this.data.bottomUserName) {
      wx.showToast({
        title: '没轮到你，不能吃哦',
        icon: 'none'
      })
      return
    }
    if (this.data.physicalNextUserName !== this.data.bottomUserName) {
      // 防止当前可碰可胡时轮到你你却点了吃（不合规则）
      wx.showToast({
        title: '根据规则，现在不能吃',
        icon: 'none'
      })
      return
    }
    const currentOutMjCode = this.data.currentOutMajiang.code
    const mjBottomArray = this.data.mjBottomArray
    const canEatMjCodeArray = mjBottomArray.map(mj => mj.code).filter(code => code - currentOutMjCode <= 2 || code - currentOutMjCode >= -2)
    const canChiArray = []
    let mjId1, mjId2
    // 判断当前是否可吃，以及可能存在的吃法
    if (canEatMjCodeArray.includes(currentOutMjCode - 2) && canEatMjCodeArray.includes(currentOutMjCode - 1)) {
      mjId1 = mjBottomArray.filter(mj => mj.code === currentOutMjCode - 2)[0].id
      mjId2 = mjBottomArray.filter(mj => mj.code === currentOutMjCode - 1)[0].id
      canChiArray.push(currentOutMjCode - 2, currentOutMjCode - 1)
    } 
    if (canEatMjCodeArray.includes(currentOutMjCode - 1) && canEatMjCodeArray.includes(currentOutMjCode + 1)) {
      mjId1 = mjBottomArray.filter(mj => mj.code === currentOutMjCode - 1)[0].id
      mjId2 = mjBottomArray.filter(mj => mj.code === currentOutMjCode + 1)[0].id
      canChiArray.push(currentOutMjCode - 1, currentOutMjCode + 1)
    } 
    if (canEatMjCodeArray.includes(currentOutMjCode + 1) && canEatMjCodeArray.includes(currentOutMjCode + 2)) {
      mjId1 = mjBottomArray.filter(mj => mj.code === currentOutMjCode + 1)[0].id
      mjId2 = mjBottomArray.filter(mj => mj.code === currentOutMjCode + 2)[0].id
      canChiArray.push(currentOutMjCode + 1, currentOutMjCode + 2)
    }
    if (mjId1 && mjId2) {
      wx.showToast({
        title: '请选择吃的牌',
        icon: 'success'
      })
      this.setData({
        isChi: true,
        canChiArray
      })
    } else {
      wx.showToast({
        title: '没有牌可以吃',
        icon: 'none'
      })
    }
  },

  /**
   * 碰牌操作
   */
  handlePeng() {
    const currentOutMjCode = this.data.currentOutMajiang.code
    const mjBottomArray = this.data.mjBottomArray
    if (mjBottomArray.filter(mj => mj.code === currentOutMjCode).length >= 2) {
      wx.sendSocketMessage({
        data: JSON.stringify({
          type: constant.MJ_PENG,
          message: '碰'
        })
      })
    } else {
      wx.showToast({
        title: '没有牌可以碰',
        icon: 'none'
      })
    }
  },

  /**
   * 杠牌操作
   */
  handleGang() {
    const currentOutMjCode = this.data.currentOutMajiang.code
    const mjBottomArray = this.data.mjBottomArray
   
    if (mjBottomArray.filter(mj => mj.code === currentOutMjCode).length === 3) {
      // 开杠，直接杠别人打出的麻将
      wx.sendSocketMessage({
        data: JSON.stringify({
          type: constant.MJ_GANG,
          message: '开杠'
        })
      })
    } else {
      if (this.data.mjBottomArray.filter(mj => !mj.show && !mj.anGang).length % 3 === 2) {
        // 牌数正好，只能是暗杠和加杠
        wx.showToast({
          title: '请选择杠的牌',
          icon: 'success'
        })
        this.setData({ isGang: true })
      } else {
        wx.showToast({
          title: '没有牌可以杠',
          icon: 'none'
        })
      }
    }
  },

  /**
   * 胡牌操作，如果能胡则直接胡，不能胡该按钮点了没有用（也没有提示）
   */
  handleHu() {
    if (this.data.currentUserName !== this.data.bottomUserName) {
      wx.showToast({
        title: '没轮到你，不能胡哦',
        icon: 'none'
      })
      return
    }
    if (this.data.canQiangJin) {
      // 判断是否能抢金
      wx.sendSocketMessage({
        data: JSON.stringify({
          type: constant.MJ_HU,
          message: '抢金'
        })
      })
    } else {
      wx.sendSocketMessage({
        data: JSON.stringify({
          type: constant.MJ_HU,
          message: '胡'
        })
      })
    }
  },

  /**
   * 过牌操作，即跳过碰、杠或胡时才有用，否则点了没用
   */
  handlePass() {
    if (this.data.currentUserName !== this.data.bottomUserName) {
      wx.showToast({
        title: '没轮到你，点击无效',
        icon: 'none'
      })
      return
    }
    wx.sendSocketMessage({
      data: JSON.stringify({
        type: constant.PASS,
        message: '过'
      })
    })
  },

  /**
   * 准备操作，即开启websocket连接
   */
  handleReady: function() {
    if (this.data.connected) {
      wx.showToast({
        title: '已准备，不用重复准备',
        icon: 'none'
      })
      return
    }
    wx.connectSocket({
      url: 'ws://192.168.43.74:8080/game/' + encodeURI(app.globalData.userInfo.nickName)
    })
  },

  /**
   * 游戏开始操作
   */
  handleStartGame: function() {
    if (!this.data.connected) {
      wx.showToast({
        title: '请先准备！',
        icon: 'success'
      })
      return
    }
    if (this.data.gameStarted) {
      wx.showToast({
        title: '游戏正在进行中'
      })
    } else {
      wx.sendSocketMessage({
        data: JSON.stringify({
          type: constant.START_GAME,
          message: 'start game'
        })
      })
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {
    // 响应接收到webSocket消息时的操作
    wx.onSocketMessage((res) => {
      // 游戏对象
      const game = JSON.parse(res.data)
      console.log(game)

      const currentUserName = game.currentUserName
      const currentOutMajiang = game.currentOutMajiang
      const currentInMajiang = game.currentInMajiang

      let myIndex
      game.userList.forEach((user, index) => {
        if (user.userNickName === app.globalData.userInfo.nickName) {
          myIndex = index
        }
      })

      // 确定游戏的玩家显示顺序
      const bottomUser = game.userList[myIndex];
      const rightUser = game.userList[(myIndex + 1) % 4];
      const topUser = game.userList[(myIndex + 2) % 4];
      const leftUser = game.userList[(myIndex + 3) % 4];

      const innerAudioContext = wx.createInnerAudioContext()
      switch(game.messageType) {
        case constant.GAMER_NOT_ENOUGH: {
          wx.showToast({
            title: '人数未满4人，不能开局',
            icon: 'none'
          })
          return;
        }
        case constant.CLIENT_READY: {
          wx.showToast({
            title: '准备成功',
            icon: 'success'
          })
          this.setData({ connected: true })
          return;
        }
        case constant.START_GAME: {
          wx.showToast({
            title: '游戏开始！'
          })
          this.setData({ gameStarted: true, jin: {}, canQiangJin: false })
          break;
        }
        case constant.RESET_FLOWER: {
          if (game.jin && game.jin.name) {
            wx.showToast({
              title: `开金！金是${game.jin.name}`
            })
            this.setData({jin: game.jin})
            console.log("上方玩家是否能抢金" + topUser.canQiangJin);
            console.log("左方玩家是否能抢金" + leftUser.canQiangJin);
            console.log("右方玩家是否能抢金" + rightUser.canQiangJin);
            console.log("下方玩家是否能抢金" + bottomUser.canQiangJin);
            // 判断自己是否能抢金
            if (bottomUser.canQiangJin) {
               this.setData({canQiangJin: true})
            }
          }
          innerAudioContext.src = '/assets/sound/buhua.ogg';
          innerAudioContext.play()
          break;
        }
        case constant.MJ_OUT: {
          innerAudioContext.src = `/assets/sound/${(game.currentOutMajiang.code + 10) % 30}.mp3`;  // 音频资源的文件和麻将的点数命名顺序不一致，故作调整
          innerAudioContext.play()
          break;
        }
        case constant.MJ_ADD_FLOWER: {
          innerAudioContext.src = '/assets/sound/buhua.ogg';
          innerAudioContext.play()
          break;
        }
        case constant.MJ_CHI: {
          innerAudioContext.src = '/assets/sound/chi.mp3';
          innerAudioContext.play()
          break;
        }
        case constant.MJ_PENG: {
          innerAudioContext.src = '/assets/sound/peng.mp3';
          innerAudioContext.play()
          break;
        }
        case constant.MJ_GANG: {
          innerAudioContext.src = '/assets/sound/gang.mp3';
          innerAudioContext.play()
          break;
        }
        case constant.MJ_AN_GANG: {
          innerAudioContext.src = '/assets/sound/gang.mp3';
          innerAudioContext.play()
          break;
        }
        case constant.MJ_JIA_GANG: {
          innerAudioContext.src = '/assets/sound/gang.mp3';
          innerAudioContext.play()
          break;
        }
        case constant.MJ_HU: {
          innerAudioContext.src = '/assets/sound/hu.mp3';
          innerAudioContext.play()
          wx.showToast({
            title: `${game.currentUserName} 胡`,
            icon: 'success'
          })
          wx.sendSocketMessage({
            data: JSON.stringify({
              type: constant.GAME_OVER,
              message: '游戏结束'
            })
          })
          break;
        }
        case constant.GAME_OVER: {
          this.setData({ gameStarted: false })
          break;
        }
        default: break;
      }

      if (this.data.gameStarted && game.remainMajiangList.length <= 16) {
        // 剩余牌数小于16张时和局
        wx.showToast({
          title: '和局！'
        })
        wx.sendSocketMessage({
          data: JSON.stringify({
            type: constant.GAME_OVER,
            message: '游戏结束'
          })
        })
      }

      const mjBottomArray = bottomUser.userMajiangList.map((item, index) => {
        item.top = 0
        return item
      })
      const mjRightArray = rightUser.userMajiangList.map((item, index) => {
        item.top = 0
        return item
      })
      const mjTopArray = topUser.userMajiangList.map((item, index) => {
        item.top = 0
        return item
      })
      const mjLeftArray = leftUser.userMajiangList.map((item, index) => {
        item.top = 0
        return item
      })

      const mjBottomOutArray = [...bottomUser.flowerList, ...bottomUser.outList]
      const mjRightOutArray = [...rightUser.outList.reverse(), ...rightUser.flowerList.reverse()]
      const mjTopOutArray = [...topUser.outList.reverse(), ...topUser.flowerList.reverse()]
      const mjLeftOutArray = [...leftUser.flowerList, ...leftUser.outList]

      this.setData({
        currentOutMajiang: currentOutMajiang ? currentOutMajiang : {},
        currentUserName,
        bankerName: game.bankerName,
        physicalNextUserName: game.physicalNextUserName,
        currentInMajiangId: currentInMajiang && currentInMajiang.id ? currentInMajiang.id : -1,
        remainMajiangNum: game.remainMajiangList.length,
        topUserName: topUser.userNickName,
        leftUserName: leftUser.userNickName,
        rightUserName: rightUser.userNickName,
        bottomUserName: bottomUser.userNickName,
        topUserScore: topUser.score,
        leftUserScore: leftUser.score,
        rightUserScore: rightUser.score,
        bottomUserScore: bottomUser.score,
        mjLeftArray,
        mjRightArray,
        mjTopArray,
        mjBottomArray,
        mjLeftOutArray,
        mjTopOutArray,
        mjRightOutArray,
        mjBottomOutArray
      })

      // 轮到自己时
      if (currentUserName === app.globalData.userInfo.nickName) {
        // 如果有麻将摸进，说明已经摸牌
        if (currentInMajiang && currentInMajiang.id) {
          if (currentInMajiang.code > 30) {
            // 摸到的是花
            setTimeout(() => {
              wx.sendSocketMessage({
                data: JSON.stringify({
                  type: constant.MJ_ADD_FLOWER,
                  message: '补花'
                })
              })
            }, 600)
          } else {
            // 摸到的不是花，自己打牌
          }
          return
        }
        // 游戏开始时补花
        if (mjBottomArray.filter(mj => mj.code > 30).length > 0) {
          setTimeout(() => {
            wx.sendSocketMessage({
              data: JSON.stringify({
                type: constant.RESET_FLOWER,
                message: '游戏开始时补花'
              })
            })
          }, 1000)
        }
      } 
    })

    wx.onSocketError(res => {
      console.log(res)
      wx.showToast({
        title: '连接服务器失败！',
        icon: 'none'
      })
    })

    wx.onSocketOpen(res => {
      wx.sendSocketMessage({
        data: JSON.stringify({
          type: constant.CLIENT_READY,
          message: 'ready'
        })
      })
    })

    wx.onSocketClose(res => {
      console.log(res)
      wx.showToast({
        title: '连接断开',
        icon: 'none'
      })
      this.setData({
        connected: false,
        jin: {}
      })
    })
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function() {

  }
})