import { Component, OnInit, OnDestroy, ViewChild, Input, ChangeDetectorRef, TemplateRef } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { RouterProxy } from '../../../../store/router/proxy/router.proxy';
import { NavigationService } from '../../../../shared/services/navigation/navigation.service';
import { PgConstants } from '../../../../shared/constants/pg.constants';
import { StateParams } from '../../../../shared/models/state-params/state-params.model';
import { Observable } from 'rxjs/Observable';
import { GuidanceNoteService } from '../../../../shared/services/guidance-note/guidance-note.service';
import { ContentService } from '../../../../shared/services/content/content.service';
import { EssentialsComponent } from '../../../../shared/components/essentials/essentials.component';
import { RenderContentRequest } from '../../../../shared/models/dashboard/content-request.model';
import { Base64 } from 'js-base64';
import { CompileDirective } from '../../../../shared/directives/compile.directive';
import { BsModalService } from 'ngx-bootstrap/modal';
import { BsModalRef } from 'ngx-bootstrap/modal/bs-modal-ref.service';
import { FoldersService } from '../../../../shared/services/folders/folders.service';
import { CreateFolerViewModel } from '../../../../shared/models/Repository/Create.model';
import { DataStoreService } from '../../../../shared/services/data-store/data-store.service';
import { ModalService } from '../../../../shared/components/pg-modal/pg-modal.service';
import { NewItemEntity } from '../../../../shared/models/whats-new/new-group.model';


@Component({
    selector: 'app-guidance-note',
    templateUrl: './guidance-note.component.html',
    styleUrls: ['./guidance-note.component.css']
})
export class GuidanceNoteComponent implements OnInit {
    @ViewChild(EssentialsComponent) essentialComponent: EssentialsComponent;
    @ViewChild(CompileDirective) compile: CompileDirective;
    private subscriptions: Subscription = new Subscription();
    constructor(
        private _guidanceNoteService: GuidanceNoteService,
        private _contentService: ContentService,
        private _routerProxy: RouterProxy,
        private _navigationService: NavigationService,
        private changeDetectorRef: ChangeDetectorRef,
        private modalService: BsModalService,
        private _foldersService: FoldersService,
        private _dataStoreService: DataStoreService,
        private _modalService: ModalService
    ) { }
    essentials;
    guidances;
    legislations;
    commentarys;
    caseLaws;
    subTopic;
    title;
    practiceArea;
    rootArea;
    paGuidance: string = "";
    guidanceDetail: string;
    guidanceHeader: string = "";
    showGuidanceDetail: boolean = false;
    contentOutlinesList: string[] = [];

    showGuidance: boolean = true;
    rendrContentRequest: RenderContentRequest = new RenderContentRequest();
    showGuidanceDetailChildContent: boolean = false;
    guidanceDetailChildContent: string = "";
    modalRef: BsModalRef;
    @ViewChild('modalContent') modalContent: TemplateRef<any>;
    viewModel;
    saveFolderTitle;
    loadFolders: boolean = false;
    saveToFolderContent;

    ngOnInit() {
        const stateSubscription = this._routerProxy.getViewModel().subscribe((viewModel) => {
            if (viewModel) {
                this.viewModel = viewModel;
                this._guidanceNoteService.getHomeContentForSubTopic(viewModel).subscribe(data => {
                    this.subTopic = data;
                    this.rootArea = this.subTopic.result["documentPathTitles"][1].title;
                    this.title = this.subTopic.result["documentPathTitles"][1].title + ' > ' + this.subTopic.result["documentPathTitles"][3].title;
                    this.practiceArea = this.subTopic.result["documentPathTitles"][3].title;
                    this.saveFolderTitle = this.practiceArea;
                    if (this.subTopic.result["forms & precedents"] != null) {
                        this.getEssentials(this.subTopic.result["forms & precedents"], "Forms & Precedents");
                    }
                    if (this.subTopic.result["checklists"] != null) {
                        this.getEssentials(this.subTopic.result["checklists"], "Checklists");
                    }
                    if (this.subTopic.result["other resources"] != null) {
                        this.getEssentials(this.subTopic.result["other resources"], "Other Resources");
                    }
                    this.guidances = this.subTopic.result.guidance;
                    this._dataStoreService.setSessionStorageItem("Guidances", this.guidances);

                    this.commentarys = this.subTopic.result.commentary;
                    this.legislations = this.subTopic.result.legislation;
                    this.caseLaws = this.subTopic.result["case law"];
                    if (this.subTopic.result.overview) {
                        console.log(this.subTopic.result.overview);
                        this.subTopic.result.overview.forEach(overview => {
                            if (overview.topicType !== "ST") {
                                this.paGuidance += overview.rawContent;
                            }
                        });

                    }

                });
            }

        });

        this.subscriptions.add(stateSubscription);
    }

    showHideGuidanceReference(val) {
        this.showGuidance = val;
    }

    navigateToGuidanceDetails(guidancedetail) {
        guidancedetail.title = this.title;
        var selectedPracticeArea = this._dataStoreService.getSessionStorageItem("SelectedPracticeArea");
        if (selectedPracticeArea) {
            if (selectedPracticeArea.isSubscribed) {
                this._navigationService.navigate(PgConstants.constants.URLS.GuidanceNote.GuidanceNoteDetail, new StateParams(guidancedetail));
            }
            else
                this._modalService.open();
        }
        else
            this._navigationService.navigate(PgConstants.constants.URLS.GuidanceNote.GuidanceNoteDetail, new StateParams(guidancedetail));
    }

    openLContent(domainPath: string) {
        var splitArray = domainPath.split('/');
        domainPath = splitArray[splitArray.length - 1];
        this.downloadContent(domainPath, "false");
    }


    hideGuidanceDetail() {
        this.showGuidanceDetail = false;
        this.showGuidanceDetailChildContent = false;
        this.guidanceHeader = "";
    }

    hideChildGuidanceDetail() {
        this.showGuidanceDetailChildContent = false;
    }

    getEssentials(essentialsList, eType) {
        if (this.essentials == null)
            this.essentials = [];
        essentialsList.forEach(e => {
            e.subContentDomains.forEach(el => {
                el.eType = eType;
                el.guidance = this.rootArea + ' > ' + this.practiceArea;
                this.essentials.push(el);
            });
        })

    }
    ngOnDestroy() {
        this.subscriptions.unsubscribe();
    }

    openMVContent(dpath: string, hasChildren: string) {
        this.downloadContent(dpath.split('#')[0], hasChildren);
    }

    downloadContent(dpath, hasChildren) {
        var rendRequest = new RenderContentRequest();
        rendRequest.dpath = dpath;
        rendRequest.hasChildren = hasChildren
        this.guidanceDetailChildContent = null;
        this.showGuidanceDetailChildContent = false;


        this._contentService.downloadContent(rendRequest).subscribe(data => {
            if (data.mimeType == "text/html") {

                this.showGuidanceDetailChildContent = true;
                this.guidanceDetailChildContent = this.buildHtml(this._contentService.getHtmlContent(data.fileContent));
                //let componentFactory = this._componentFactoryResolver.resolveComponentFactory(this.compile.compRef.instance);
                this.compile.compile = this.guidanceDetailChildContent;
                this.compile.compileContext = this;
                this.compile.compRef.changeDetectorRef.detectChanges();
                this.compile.ngOnChanges();

            }
            else
                this._contentService.downloadattachment(data.fileContent, data.fileName, data.mimeType);
        });


    }



    downloadEssentials(data) {
        var selectedPracticeArea = this._dataStoreService.getSessionStorageItem("SelectedPracticeArea");
        if (selectedPracticeArea.isSubscribed) {
            this.rendrContentRequest.dpath = data.domainPath;
            this.rendrContentRequest.hasChildren = (data.hasChildren) ? "true" : "false";
            this._contentService.downloadContent(this.rendrContentRequest).subscribe(data => {
                this._contentService.downloadattachment(data.fileContent, data.fileName, data.mimeType);
            });
        }
        else
            this._modalService.open();
    }

    buildHtml(input: string): string {
        var regex1 = new RegExp(`onclick="javascript:window.parent.parent.addTab[(]'Loading...','PGS/ContentView.aspx[?]dpath[=]`);
        var regex2 = new RegExp(`onclick="javascript:window.parent.parent.addTab[(]'Loading...', 'Library/ContentView.aspx[?]dpath[=]`);

        input = input.replace(new RegExp('<p', 'g'), "<div");
        input = input.replace(new RegExp('</p>', 'g'), "</div><br />");
        input = input.replace(new RegExp('&#xD;&#xA;&#x9;&#x9;&#x9;&#x9;&#x9;', 'g'), "");
        input = input.replace(new RegExp('&#x9;', 'g'), "");
        input = input.replace(new RegExp(`onclick="openLContent`, 'g'), `(click)="openLContent`);
        input = input.replace(new RegExp(`onclick="openMVContent`, 'g'), `(click)="openMVContent`);
        input = input.replace(new RegExp(regex1, 'g'), `(click)="openDContent('`);
        input = input.replace(new RegExp(regex2, 'g'), `(click)="openDContent('`);
        input = input.replace(new RegExp(`href="#`, 'g'), `class="underLine`);
        input = input.replace(new RegExp('[^\u0000-\u007F]', 'g'), ' ');

        return input;
    }

    openDContent(domainPath: string) {
        if (domainPath.indexOf('#') !== -1)
            domainPath = domainPath.split('#')[0];
        this.downloadContent(domainPath, "false");
    }



    showFolderModal(modal) {

        this.openModal(modal);
    }

    openModal(template: TemplateRef<any>) {
        var content = {
            "title": (this.viewModel.practiceArea) ? this.viewModel.practiceArea : this.viewModel.title,
            "url": (this.viewModel.subTopicDomainPath) ? this.viewModel.subTopicDomainPath : this.viewModel.domainPath,
            "searchResult": null
        };
        this.saveToFolderContent = JSON.parse(JSON.stringify(content));

        this.getFoldersAll(template);
    }

    folderInfo;
    selectedMainFolder;
    selectedSubsciberClientId;
    mainFolder;
    selFolder;
    getFoldersAll(template) {
        this.loadFolders = true;
        this.modalRef = this.modalService.show(template, { class: 'modal-lg' });
    }

    onParentFolderSelect(subscriberClientId) {
        this.selectedSubsciberClientId = subscriberClientId;
        this.selectedMainFolder = this.folderInfo.find(f => f.subscriberClientId == subscriberClientId);
        this.mainFolder = {
            "zoneId": this.selectedMainFolder.zoneId,
            "subscriberId": this.selectedMainFolder.subscriberId,
            "subscriberClientId": this.selectedMainFolder.subscriberClientId,
            "lastAccessedDate": this.selectedMainFolder.lastAccessedDate,
            "dateCreated": this.selectedMainFolder.dateCreated,
            "clientDescription": this.selectedMainFolder.clientDescription,
            "isSelected": false
        };
    }

    onSaveToFolderClick(folder) {
        this.selFolder = folder;
        this.SaveFile();
    }

    SaveFile() {
        if (this.selFolder) {
            var createFolder = new CreateFolerViewModel();
            createFolder.subscriberClientId = this.selFolder.subscriberClientID;
            createFolder.folderID = this.selFolder.folderNameID;
            createFolder.url = (this.viewModel.subTopicDomainPath) ? this.viewModel.subTopicDomainPath : this.viewModel.domainPath;
            createFolder.title = (this.viewModel.practiceArea) ? this.viewModel.practiceArea : this.viewModel.title;
            this._foldersService.CreateDocument(createFolder).subscribe(data => {
                this.modalRef.hide();
            });
        }
        else
            alert("Please select a folder");
    }

    back() {
        var previousRoute = this._navigationService.getPreviousRoute();
        this._navigationService.navigate(previousRoute.previousRoute, this._navigationService.getStateParams(previousRoute.previousRoute), undefined, true);
    }

    onPopUpCloseClick() {
        this.loadFolders = false;
        this.saveToFolderContent = null;
        this.modalRef.hide();
    }

    loadContentView(guidancecontent) {
        var selectedPracticeArea = this._dataStoreService.getSessionStorageItem("SelectedPracticeArea");
        if (selectedPracticeArea) {
          if (selectedPracticeArea.isSubscribed) {
            this.navigateToContentView(guidancecontent);
          }
          else
            this._modalService.open();
        }
        else
          this.navigateToContentView(guidancecontent);

    }

    navigateToContentView(guidancecontent) {
      var file = new NewItemEntity();
      file.domainPath = guidancecontent.domainPath;
      file.title = guidancecontent.title;
      file.hasChildren = "false";
      this._dataStoreService.setSessionStorageItem("selectedNewItem", file);
      this._navigationService.navigate(PgConstants.constants.URLS.ContentView.ContentView);
    }

}
